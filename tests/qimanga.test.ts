import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors";
import { resolveSite } from "../src/core/registry";
import type { ChapterRef, Http } from "../src/core/types";
import { siteAdapters } from "../src/sites";
import { qimanga } from "../src/sites/qimanga";

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

const SERIES_URL = "https://qimanga.com/series/agent-reborn";
const SERIES_JSON = JSON.stringify({
  slug: "agent-reborn",
  title: "Agent Reborn",
});

const chapterRef = (slug: string, number: number): ChapterRef => ({
  id: slug,
  number,
  label: `Chapter ${number}`,
  url: `https://qimanga.com/series/agent-reborn/${slug}`,
  date: null,
});

/** Answers each request with `respond(url)`, recording every URL asked for. */
const httpWith = (
  respond: (url: string) => string,
  finalUrl?: (url: string) => string,
): Http & { requested: string[] } => {
  const requested: string[] = [];
  return {
    requested,
    getText: async (url) => {
      requested.push(url);
      return { text: respond(url), finalUrl: finalUrl?.(url) ?? url };
    },
    getBytes: async () => Buffer.alloc(0),
  };
};

const listPage = (numbers: number[], nextCursor: string | null): string =>
  JSON.stringify({
    data: numbers.map((number) => ({ slug: `chapter-${number}`, number })),
    hasMore: nextCursor !== null,
    nextCursor,
  });

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

describe("qimanga", () => {
  it("should be picked for a qimanga.com series link", () => {
    expect(resolveSite(siteAdapters, SERIES_URL).adapter.id).toBe("qimanga");
  });

  it("should read the title and every chapter of a series", async () => {
    const http = httpWith((url) =>
      url.includes("/chapters")
        ? fixture("qimanga-chapters.json")
        : SERIES_JSON,
    );

    const series = await qimanga.getSeries(new URL(SERIES_URL), http);

    expect(series.title).toBe("Agent Reborn");
    expect(series.chapters).toHaveLength(17);
    expect(series.missingNumbers).toEqual([]);
    expect(series.chapters[12]).toMatchObject({
      number: 13,
      label: "Chapter 13 The Tiger's Shadow Revealed",
      url: "https://qimanga.com/series/agent-reborn/chapter-13-the-tigers-shadow-revealed",
    });
  });

  it("should mark chapters that must be bought", async () => {
    const http = httpWith((url) =>
      url.includes("/chapters")
        ? fixture("qimanga-chapters.json")
        : SERIES_JSON,
    );

    const series = await qimanga.getSeries(new URL(SERIES_URL), http);

    expect(series.chapters.at(-1)?.label).toBe("Chapter 17 (ล็อก)");
    expect(series.chapters[0]?.label).toBe("Chapter 1");
  });

  it("should follow the cursor until the list has no more pages", async () => {
    const http = httpWith((url) => {
      if (!url.includes("/chapters")) return SERIES_JSON;
      return new URL(url).searchParams.get("cursor") === "next"
        ? listPage([1, 2], null)
        : listPage([4, 3], "next");
    });

    const series = await qimanga.getSeries(new URL(SERIES_URL), http);

    expect(series.chapters.map((chapter) => chapter.number)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(
      http.requested.filter((url) => url.includes("/chapters")),
    ).toHaveLength(2);
  });

  it("should stop with PARSE_FAILED when the cursor repeats", async () => {
    const http = httpWith((url) =>
      url.includes("/chapters") ? listPage([1], "same") : SERIES_JSON,
    );

    expect(
      await codeOf(() => qimanga.getSeries(new URL(SERIES_URL), http)),
    ).toBe("PARSE_FAILED");
  });

  it("should reject a link that is not a series page", async () => {
    const http = httpWith(() => SERIES_JSON);

    const code = await codeOf(() =>
      qimanga.getSeries(new URL(`${SERIES_URL}/chapter-1`), http),
    );

    expect(code).toBe("INVALID_URL");
    expect(http.requested).toEqual([]);
  });

  it("should refuse an API response that redirects to another host", async () => {
    const http = httpWith(
      () => SERIES_JSON,
      () => "https://other.example/x",
    );

    expect(
      await codeOf(() => qimanga.getSeries(new URL(SERIES_URL), http)),
    ).toBe("UNSAFE_URL");
  });

  it("should read the images of a chapter in reading order", async () => {
    const http = httpWith(() => fixture("qimanga-chapter.json"));

    const pages = await qimanga.getPages(chapterRef("chapter-1", 1), http);

    expect(http.requested).toEqual([
      "https://api.qimanga.com/api/v1/series/agent-reborn/chapters/chapter-1",
    ]);
    expect(pages.imageUrls).toHaveLength(20);
    expect(pages.imageUrls[0]).toMatch(
      /^https:\/\/media\.qimanga\.com\/.*\/00\.webp$/,
    );
    expect(pages.pageNumber).toBe(1);
    expect(pages.referer).toBe("https://qimanga.com/");
  });

  it("should report CHAPTER_NO_IMAGES when the chapter must be bought", async () => {
    const http = httpWith(() => fixture("qimanga-chapter-locked.json"));

    expect(
      await codeOf(() => qimanga.getPages(chapterRef("chapter-17", 17), http)),
    ).toBe("CHAPTER_NO_IMAGES");
  });

  it("should refuse an image URL that points at a local address", async () => {
    const http = httpWith(() =>
      JSON.stringify({
        number: 1,
        images: [{ order: 0, url: "http://127.0.0.1/a.webp" }],
      }),
    );

    expect(
      await codeOf(() => qimanga.getPages(chapterRef("chapter-1", 1), http)),
    ).toBe("UNSAFE_URL");
  });

  it("should refuse a chapter URL that is not on the site", async () => {
    const http = httpWith(() => fixture("qimanga-chapter.json"));
    const chapter = {
      ...chapterRef("chapter-1", 1),
      url: "https://other.example/series/a/b",
    };

    expect(await codeOf(() => qimanga.getPages(chapter, http))).toBe(
      "UNSAFE_URL",
    );
    expect(http.requested).toEqual([]);
  });
});
