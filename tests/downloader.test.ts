import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectImageExtension,
  downloadChapters,
  renameLegacyFolders,
} from "../src/core/downloader";
import { AppError } from "../src/core/errors";
import type { DownloadEvent } from "../src/core/events";
import type { Manifest } from "../src/core/manifest";
import type {
  ChapterPages,
  ChapterRef,
  Http,
  Series,
  SiteAdapter,
} from "../src/core/types";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const HTML = Buffer.from("<html>blocked</html>");

const chapterOne: ChapterRef = {
  id: "series-chapter-1",
  number: 1,
  label: "Chapter 1",
  url: "https://example.com/series-chapter-1/",
  date: null,
};

const series: Series = {
  siteId: "example",
  siteName: "Example",
  url: "https://example.com/manga/series/",
  title: "Series",
  chapters: [chapterOne],
  missingNumbers: [],
};

const pagesOf = (
  count: number,
  pageNumber: number | null = 1,
): ChapterPages => ({
  imageUrls: Array.from(
    { length: count },
    (_, i) => `https://cdn.example.com/${i + 1}.jpg`,
  ),
  referer: "https://example.com/",
  finalUrl: chapterOne.url,
  pageTitle: "Series Chapter 1",
  pageNumber,
});

const adapterWith = (pages: ChapterPages): SiteAdapter => ({
  id: "example",
  name: "Example",
  domains: ["example.com"],
  exampleUrl: series.url,
  engine: "Test",
  matches: () => true,
  getSeries: async () => series,
  getPages: async () => pages,
});

interface FakeHttp extends Http {
  requested: string[];
}

const httpWith = (respond: (url: string) => Buffer): FakeHttp => {
  const requested: string[] = [];
  return {
    requested,
    getText: async (url) => ({ text: "", finalUrl: url }),
    getBytes: async (url) => {
      requested.push(url);
      return respond(url);
    },
  };
};

describe("downloadChapters", () => {
  let outDir: string;
  let events: DownloadEvent[];

  const run = (
    adapter: SiteAdapter,
    http: Http,
    signal = new AbortController().signal,
  ) =>
    downloadChapters({
      adapter,
      series,
      chapters: [chapterOne],
      outDir,
      http,
      imageConcurrency: 2,
      emit: (event) => events.push(event),
      signal,
    });

  const seriesDir = (): string => join(outDir, "example", "Series");
  const chapterDir = (): string => join(seriesDir(), "Chapter 1");

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), "manga-dl-test-"));
    events = [];
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("should save every page and mark the chapter done", async () => {
    const summary = await run(
      adapterWith(pagesOf(3)),
      httpWith(() => JPEG),
    );

    expect(summary).toMatchObject({ done: 1, incomplete: 0, failed: 0 });
    expect((await readdir(chapterDir())).sort()).toEqual([
      "001.jpg",
      "002.jpg",
      "003.jpg",
    ]);
  });

  it("should record page status in the manifest", async () => {
    await run(
      adapterWith(pagesOf(2)),
      httpWith(() => JPEG),
    );

    const manifest = JSON.parse(
      await readFile(
        join(outDir, "example", "Series", "manifest.json"),
        "utf8",
      ),
    ) as Manifest;

    expect(manifest.chapters[chapterOne.id]).toMatchObject({
      status: "done",
      folder: "Chapter 1",
      pages: [
        { index: 1, file: "001.jpg", status: "ok", bytes: JPEG.length },
        { index: 2, file: "002.jpg", status: "ok", bytes: JPEG.length },
      ],
    });
  });

  it("should mark the chapter incomplete when one page is not an image", async () => {
    const http = httpWith((url) => (url.endsWith("/2.jpg") ? HTML : JPEG));

    const summary = await run(adapterWith(pagesOf(3)), http);

    expect(summary).toMatchObject({ done: 0, incomplete: 1 });
    expect(summary.failures[0]?.failedPages).toEqual([2]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "page-failed",
        pageIndex: 2,
        error: expect.objectContaining({ code: "IMAGE_CORRUPT" }),
      }),
    );
  });

  it("should fail the chapter without downloading when the page is another chapter", async () => {
    const http = httpWith(() => JPEG);

    const summary = await run(adapterWith(pagesOf(3, 148)), http);

    expect(summary.failed).toBe(1);
    expect(summary.failures[0]?.error?.code).toBe("CHAPTER_MISMATCH");
    expect(http.requested).toEqual([]);
  });

  it("should fail the chapter when it has no images", async () => {
    const summary = await run(
      adapterWith(pagesOf(0)),
      httpWith(() => JPEG),
    );

    expect(summary.failures[0]?.error?.code).toBe("CHAPTER_NO_IMAGES");
  });

  it("should skip a chapter that is already complete on disk", async () => {
    await run(
      adapterWith(pagesOf(2)),
      httpWith(() => JPEG),
    );
    const http = httpWith(() => JPEG);

    const summary = await run(adapterWith(pagesOf(2)), http);

    expect(summary).toMatchObject({ skipped: 1, done: 0 });
    expect(http.requested).toEqual([]);
  });

  it("should fetch only the missing pages when retrying an incomplete chapter", async () => {
    const flaky = httpWith((url) => (url.endsWith("/2.jpg") ? HTML : JPEG));
    await run(adapterWith(pagesOf(3)), flaky);
    const http = httpWith(() => JPEG);

    const summary = await run(adapterWith(pagesOf(3)), http);

    expect(summary.done).toBe(1);
    expect(http.requested).toEqual(["https://cdn.example.com/2.jpg"]);
  });

  it("should stop and report cancelled when the signal aborts", async () => {
    const controller = new AbortController();
    const http = httpWith(() => {
      controller.abort();
      throw new AppError("CANCELLED", "Cancelled by user");
    });

    const summary = await run(adapterWith(pagesOf(3)), http, controller.signal);

    expect(summary.cancelled).toBe(true);
    expect(summary.done).toBe(0);
  });

  describe("folders saved by an older version", () => {
    const manifestPath = (): string => join(seriesDir(), "manifest.json");
    const readManifest = async (): Promise<Manifest> =>
      JSON.parse(await readFile(manifestPath(), "utf8")) as Manifest;
    /** Rewrites a finished download so it looks like the zero-padded layout. */
    const makeLegacy = async (folder: string): Promise<Manifest> => {
      await run(
        adapterWith(pagesOf(2)),
        httpWith(() => JPEG),
      );
      await rename(chapterDir(), join(seriesDir(), folder));
      const manifest = await readManifest();
      const record = manifest.chapters[chapterOne.id];
      if (!record) throw new Error("chapter record missing");
      record.folder = folder;
      await writeFile(manifestPath(), JSON.stringify(manifest));
      return manifest;
    };

    it("should move the folder to the new name and skip the chapter when it is intact", async () => {
      await makeLegacy("0001");
      const http = httpWith(() => JPEG);

      const summary = await run(adapterWith(pagesOf(2)), http);

      expect(summary).toMatchObject({ skipped: 1, done: 0 });
      expect(http.requested).toEqual([]);
      expect((await readdir(seriesDir())).sort()).toEqual([
        "Chapter 1",
        "manifest.json",
      ]);
      expect((await readManifest()).chapters[chapterOne.id]?.folder).toBe(
        "Chapter 1",
      );
    });

    it("should keep the old folder when the new name is already taken", async () => {
      const manifest = await makeLegacy("0001");
      await mkdir(chapterDir());

      const changed = await renameLegacyFolders(seriesDir(), manifest);

      expect(changed).toBe(false);
      expect(manifest.chapters[chapterOne.id]?.folder).toBe("0001");
    });

    it("should stay inside the series folder when the recorded number is a path", async () => {
      const manifest = await makeLegacy("0001");
      const record = manifest.chapters[chapterOne.id];
      if (!record) throw new Error("chapter record missing");
      // a hand-edited manifest: the type says number, the file says otherwise
      record.number = "../../escaped" as unknown as number;

      await renameLegacyFolders(seriesDir(), manifest);

      // the bogus number is ignored and the id names the folder instead
      expect(await readdir(outDir)).toEqual(["example"]);
      expect((await readdir(seriesDir())).sort()).toEqual([
        "manifest.json",
        chapterOne.id,
      ]);
    });

    it("should download again when a saved page name points outside the chapter", async () => {
      await run(
        adapterWith(pagesOf(1)),
        httpWith(() => JPEG),
      );
      const secret = join(outDir, "secret.jpg");
      await writeFile(secret, JPEG);
      const manifest = await readManifest();
      const page = manifest.chapters[chapterOne.id]?.pages[0];
      if (!page) throw new Error("page record missing");
      page.file = "../../../secret.jpg";
      await writeFile(manifestPath(), JSON.stringify(manifest));
      const http = httpWith(() => JPEG);

      const summary = await run(adapterWith(pagesOf(1)), http);

      expect(summary).toMatchObject({ skipped: 0, done: 1 });
      expect(http.requested).toHaveLength(1);
      expect(
        (await readManifest()).chapters[chapterOne.id]?.pages[0]?.file,
      ).toBe("001.jpg");
    });

    it("should not move anything when the recorded folder points outside the series", async () => {
      const manifest = await makeLegacy("0001");
      const outside = join(outDir, "outside");
      await mkdir(outside);
      const record = manifest.chapters[chapterOne.id];
      if (!record) throw new Error("chapter record missing");
      record.folder = "../../outside";

      const changed = await renameLegacyFolders(seriesDir(), manifest);

      expect(changed).toBe(false);
      expect(await readdir(outDir)).toContain("outside");
      expect(await readdir(seriesDir())).not.toContain("Chapter 1");
    });
  });
});

describe("detectImageExtension", () => {
  it("should recognise a JPEG", () => {
    expect(detectImageExtension(JPEG)).toBe("jpg");
  });

  it("should recognise a WebP", () => {
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WEBP"),
    ]);

    expect(detectImageExtension(webp)).toBe("webp");
  });

  it("should reject HTML and empty bodies", () => {
    expect(detectImageExtension(HTML)).toBeNull();
    expect(detectImageExtension(Buffer.alloc(0))).toBeNull();
  });
});
