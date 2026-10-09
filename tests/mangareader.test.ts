import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors";
import {
  parseChapterPage,
  parseSeriesPage,
} from "../src/sites/themes/mangareader";

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

const SERIES_URL =
  "https://arenascan.com/manga/reset-life-of-regression-police/";
const CHAPTER_URL =
  "https://arenascan.com/reset-life-of-regression-police-chapter-148/";

const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

describe("parseSeriesPage", () => {
  const parsed = parseSeriesPage(fixture("arenascan-series.html"), SERIES_URL);

  it("should read the series title", () => {
    expect(parsed.title).toBe("Reset Life of Regression Police");
  });

  it("should list every chapter in the chapter list", () => {
    expect(parsed.chapters).toHaveLength(170);
  });

  it("should sort chapters oldest first", () => {
    const numbers = parsed.chapters.map((chapter) => chapter.number ?? -1);

    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it("should take the chapter URL from the list instead of building it", () => {
    const latest = parsed.chapters.at(-1);

    expect(latest).toMatchObject({
      number: 174,
      label: "Chapter 174",
      url: "https://arenascan.com/reset-life-of-regression-police-chapter-174/",
      id: "reset-life-of-regression-police-chapter-174",
    });
  });

  it("should throw PARSE_FAILED when the title is missing", () => {
    expect(codeOf(() => parseSeriesPage("<html></html>", SERIES_URL))).toBe(
      "PARSE_FAILED",
    );
  });

  it("should throw CHAPTER_LIST_EMPTY when no chapter is listed", () => {
    const html =
      '<h1 class="entry-title">Title</h1><div id="chapterlist"></div>';

    expect(codeOf(() => parseSeriesPage(html, SERIES_URL))).toBe(
      "CHAPTER_LIST_EMPTY",
    );
  });
});

describe("parseChapterPage", () => {
  it("should read image URLs from the ts_reader payload", () => {
    const parsed = parseChapterPage(
      fixture("arenascan-chapter.html"),
      CHAPTER_URL,
    );

    expect(parsed.imageUrls).toHaveLength(22);
    expect(parsed.imageUrls[0]).toBe(
      "https://cdn.arenascan.com/arena-bucket/261275/148/001.jpg",
    );
  });

  it("should report the chapter number shown on the page", () => {
    const parsed = parseChapterPage(
      fixture("arenascan-chapter.html"),
      CHAPTER_URL,
    );

    expect(parsed.pageNumber).toBe(148);
  });

  it("should fall back to images inside #readerarea", () => {
    const html =
      '<h1 class="entry-title">Title Chapter 2</h1><div id="readerarea"><img src="/a/1.jpg"><img src="/a/2.jpg"></div>';

    const parsed = parseChapterPage(html, CHAPTER_URL);

    expect(parsed.imageUrls).toEqual([
      "https://arenascan.com/a/1.jpg",
      "https://arenascan.com/a/2.jpg",
    ]);
  });

  it("should return no images when the reader is empty", () => {
    const html = '<div id="readerarea"></div>';

    expect(parseChapterPage(html, CHAPTER_URL).imageUrls).toEqual([]);
  });

  it("should throw PARSE_FAILED when there is no reader at all", () => {
    expect(codeOf(() => parseChapterPage("<html></html>", CHAPTER_URL))).toBe(
      "PARSE_FAILED",
    );
  });
});
