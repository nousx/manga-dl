import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSite } from "../src/core/registry";
import type { Http } from "../src/core/types";
import { siteAdapters } from "../src/sites";
import {
  divascans,
  parseDivaChapterPage,
  parseDivaSeriesPage,
} from "../src/sites/divascans";

const SERIES = "https://divascans.org/series/comic/can-life-be-monetized";
const CHAPTER = `${SERIES}/chapter/1`;
const fixture = (kind: string): string =>
  readFileSync(
    join(import.meta.dirname, "fixtures", `divascans-${kind}.html`),
    "utf8",
  );
const series = {
  title: "Can Life Be Monetized?",
  slug: "can-life-be-monetized",
};
const page = (number: number) => ({
  pageNumber: number,
  imageUrl: `https://media.divascans.org/${number}.webp`,
});
const chapterProps = () => ({
  series,
  chapter: { number: 1, pages: [page(1), page(2)] },
  isUnlocked: true,
  isLocked: false,
});
const seriesProps = (currentPage = 1, totalPages = 1) => ({
  series,
  currentPage,
  totalPages,
  chapters: [{ id: `chapter-${currentPage}`, number: currentPage }],
});
const document = (props: unknown, links = "", split = false): string => {
  const record = `a:${JSON.stringify(["$", "Reader", null, props])}\n`;
  const parts = split ? [record.slice(0, 40), record.slice(40)] : [record];
  return `${links}${parts.map((part) => `<script>self.__next_f.push(${JSON.stringify([1, part])})</script>`).join("")}`;
};
const list = (currentPage = 1, totalPages = 1): string =>
  document(
    seriesProps(currentPage, totalPages),
    `<a href="${SERIES}/chapter/${currentPage}">Chapter</a>`,
  );
const httpWith = (
  respond: (url: string) => { text: string; finalUrl: string },
): Http => ({
  getText: async (url) => respond(url),
  getBytes: async () => Buffer.alloc(0),
});

describe("Diva Scans series", () => {
  it("should select Diva Scans when a supported series URL is supplied", () => {
    const result = resolveSite(siteAdapters, SERIES);

    expect(result.adapter.id).toBe("divascans");
  });

  it("should return all chapters when parsing the saved live series page", () => {
    const result = parseDivaSeriesPage(fixture("series"), SERIES);

    expect(result.title).toBe("Can Life Be Monetized?");
    expect(result.chapters.map((chapter) => chapter.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("should label locked chapters when the source denies access", () => {
    const result = parseDivaSeriesPage(fixture("series"), SERIES);

    expect(result.chapters.at(-1)?.label).toBe("Chapter 9 (ล็อก)");
  });

  it("should retain the source URL and date when parsing a chapter reference", () => {
    const result = parseDivaSeriesPage(fixture("series"), SERIES);

    expect(result.chapters[0]).toMatchObject({
      url: CHAPTER,
      date: "2026-10-04T19:10:54.389Z",
    });
  });

  it("should combine list pages when the series has pagination", async () => {
    const requested: string[] = [];
    const http = httpWith((url) => {
      requested.push(url);
      return {
        text: list(new URL(url).searchParams.has("page") ? 2 : 1, 2),
        finalUrl: url,
      };
    });

    const result = await divascans.getSeries(new URL(SERIES), http);

    expect(result.chapters.map((chapter) => chapter.number)).toEqual([1, 2]);
    expect(requested).toEqual([SERIES, `${SERIES}?page=2`]);
  });

  it("should reject a repeated list page when pagination does not advance", async () => {
    const http = httpWith((url) => ({ text: list(1, 2), finalUrl: url }));

    const result = divascans.getSeries(new URL(SERIES), http);

    await expect(result).rejects.toMatchObject({ code: "PARSE_FAILED" });
  });

  it("should reject off-site chapter links when a page supplies a foreign URL", () => {
    const html = document(
      seriesProps(),
      '<a href="https://evil.example/series/comic/can-life-be-monetized/chapter/1">Chapter</a>',
    );

    expect(() => parseDivaSeriesPage(html, SERIES)).toThrow(
      "Missing on-site link",
    );
  });

  it("should reject unsupported paths when a chapter URL is submitted as a series", async () => {
    const http = httpWith(() => {
      throw new Error("Should not request");
    });

    const result = divascans.getSeries(new URL(CHAPTER), http);

    await expect(result).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("should reject off-site redirects when fetching a series", async () => {
    const http = httpWith(() => ({
      text: list(),
      finalUrl: "https://evil.example/",
    }));

    const result = divascans.getSeries(new URL(SERIES), http);

    await expect(result).rejects.toMatchObject({ code: "UNSAFE_URL" });
  });

  it("should reject excessive pagination when source data exceeds the limit", () => {
    const html = list(1, 101);

    expect(() => parseDivaSeriesPage(html, SERIES)).toThrow(
      "Invalid chapter list pagination",
    );
  });
});

describe("Diva Scans chapter", () => {
  it("should return ordered images when parsing the saved live reader", () => {
    const result = parseDivaChapterPage(fixture("chapter"), CHAPTER);

    expect(result.imageUrls).toHaveLength(81);
    expect(result.imageUrls[0]).toBe(
      "https://media.divascans.org/series/can-life-be-monetized/0001/p-8f8d60d2-1208-497c-af8b-59b26d6c3e94.webp",
    );
    expect(result.pageNumber).toBe(1);
  });

  it("should join Flight chunks when JSON spans script elements", () => {
    const html = document(chapterProps(), "", true);

    const result = parseDivaChapterPage(html, CHAPTER);

    expect(result.imageUrls).toEqual([page(1).imageUrl, page(2).imageUrl]);
  });

  it("should sort by page number when source records are unordered", () => {
    const props = chapterProps();
    props.chapter.pages.reverse();

    const result = parseDivaChapterPage(document(props), CHAPTER);

    expect(result.imageUrls).toEqual([page(1).imageUrl, page(2).imageUrl]);
  });

  it("should reject a locked chapter when preview images are present", () => {
    const props = { ...chapterProps(), isUnlocked: false, isLocked: true };

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "This chapter is locked",
    );
  });

  it("should reject incomplete page sequences when a page number is missing", () => {
    const props = chapterProps();
    props.chapter.pages = [page(1), page(3)];

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "page numbers are missing or duplicated",
    );
  });

  it("should reject local image URLs when reader data points at the private network", () => {
    const props = chapterProps();
    props.chapter.pages = [
      { pageNumber: 1, imageUrl: "http://127.0.0.1/private.png" },
    ];

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "Invalid chapter image URL",
    );
  });

  it("should reject protected formats when image scrambling is enabled", () => {
    const props = {
      ...chapterProps(),
      protectionConfig: { useImageScramble: true },
    };

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "Protected image formats are not supported",
    );
  });

  it("should reject redacted pages when a source provides partial content", () => {
    const props = {
      ...chapterProps(),
      chapter: { number: 1, pages: [{ ...page(1), isRedacted: true }] },
    };

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "A page is redacted",
    );
  });

  it.each([6, 7, 8])(
    "should return original image URLs when chapter %i has stale protection metadata",
    (number) => {
      const expected = { 6: 83, 7: 79, 8: 86 }[number];

      const result = parseDivaChapterPage(
        fixture(`chapter-${number}`),
        `${SERIES}/chapter/${number}`,
      );

      expect(result.imageUrls).toHaveLength(expected!);
      expect(result.pageNumber).toBe(number);
      expect(
        result.imageUrls.every((url) => url.includes(`/000${number}/p-`)),
      ).toBe(true);
    },
  );

  it("should reject encrypted page metadata when the source does not explicitly disable protection", () => {
    const props = {
      ...chapterProps(),
      chapter: { number: 1, pages: [{ ...page(1), isEncrypted: true }] },
    };

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "unsupported protected format",
    );
  });

  it("should reject redacted pages when protection is explicitly disabled", () => {
    const props = {
      ...chapterProps(),
      protectionConfig: {
        isProtected: false,
        useCanvasRendering: false,
        useTileEncryption: false,
        useFragmentProtection: false,
        useImageScramble: false,
      },
      chapter: { number: 1, pages: [{ ...page(1), isRedacted: true }] },
    };

    expect(() => parseDivaChapterPage(document(props), CHAPTER)).toThrow(
      "A page is redacted",
    );
  });

  it("should reject missing reader data when an error page is returned", () => {
    expect(() => parseDivaChapterPage("<h1>Unavailable</h1>", CHAPTER)).toThrow(
      "No Diva Scans chapter data",
    );
  });

  it("should reject malformed data without evaluating site JavaScript", () => {
    const html = "<script>self.__next_f.push(process.exit())</script>";

    expect(() => parseDivaChapterPage(html, CHAPTER)).toThrow(
      "Invalid Next.js data chunk",
    );
  });

  it("should return the actual page number when the reader reports a different chapter", () => {
    const props = chapterProps();
    props.chapter.number = 2;

    const result = parseDivaChapterPage(document(props), CHAPTER);

    expect(result.pageNumber).toBe(2);
  });

  it("should reject a changed chapter path when a request redirects", async () => {
    const chapter = parseDivaSeriesPage(fixture("series"), SERIES).chapters[0]!;
    const http = httpWith(() => ({
      text: fixture("chapter"),
      finalUrl: `${SERIES}/chapter/2`,
    }));

    const result = divascans.getPages(chapter, http);

    await expect(result).rejects.toMatchObject({ code: "CHAPTER_MISMATCH" });
  });
});
