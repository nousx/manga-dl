import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors";
import { resolveSite } from "../src/core/registry";
import type { Http } from "../src/core/types";
import { siteAdapters } from "../src/sites";
import { kingofshojo } from "../src/sites/kingofshojo";

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

const SERIES_URL =
  "https://kingofshojo.com/manga/the-saint-who-levels-up-as-a-necromancer/";
const CHAPTER_URL =
  "https://kingofshojo.com/the-saint-who-levels-up-as-a-necromancer-chapter-42/";

/** Serves one page for every request, optionally as if redirected elsewhere. */
const httpServing = (text: string, finalUrl?: string): Http => ({
  getText: async (url) => ({ text, finalUrl: finalUrl ?? url }),
  getBytes: async () => Buffer.alloc(0),
});

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

describe("kingofshojo", () => {
  it("should be picked for a kingofshojo.com link", () => {
    const { adapter } = resolveSite(siteAdapters, SERIES_URL);

    expect(adapter.id).toBe("kingofshojo");
  });

  it("should be picked for the www host as well", () => {
    const { adapter } = resolveSite(
      siteAdapters,
      "https://www.kingofshojo.com/manga/some-series/",
    );

    expect(adapter.id).toBe("kingofshojo");
  });

  it("should read the title and every chapter of a series", async () => {
    const http = httpServing(fixture("kingofshojo-series.html"));

    const series = await kingofshojo.getSeries(new URL(SERIES_URL), http);

    expect(series.title).toBe("The Saint Who Levels Up as a Necromancer");
    expect(series.chapters).toHaveLength(42);
    expect(series.missingNumbers).toEqual([]);
    expect(series.chapters.at(-1)).toMatchObject({
      number: 42,
      label: "Chapter 42",
      url: CHAPTER_URL,
    });
  });

  it("should read the images of a chapter from the site's CDN", async () => {
    const http = httpServing(fixture("kingofshojo-chapter.html"));
    const chapter = {
      id: "the-saint-who-levels-up-as-a-necromancer-chapter-42",
      number: 42,
      label: "Chapter 42",
      url: CHAPTER_URL,
      date: null,
    };

    const pages = await kingofshojo.getPages(chapter, http);

    expect(pages.imageUrls).toHaveLength(19);
    expect(
      pages.imageUrls.every((url) =>
        url.startsWith("https://cdn.kingofshojo.com/"),
      ),
    ).toBe(true);
    expect(pages.pageNumber).toBe(42);
    expect(pages.referer).toBe("https://kingofshojo.com/");
  });

  it("should reject a link that is not a series page", async () => {
    const http = httpServing(fixture("kingofshojo-series.html"));

    const code = await codeOf(() =>
      kingofshojo.getSeries(new URL(CHAPTER_URL), http),
    );

    expect(code).toBe("INVALID_URL");
  });

  it("should refuse a series page that redirects to another site", async () => {
    const http = httpServing(
      fixture("kingofshojo-series.html"),
      "https://other.example/manga/x/",
    );

    const code = await codeOf(() =>
      kingofshojo.getSeries(new URL(SERIES_URL), http),
    );

    expect(code).toBe("UNSAFE_URL");
  });
});
