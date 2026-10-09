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

const HOSTS = ["arenascan.com"];
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
  const parsed = parseSeriesPage(
    fixture("arenascan-series.html"),
    SERIES_URL,
    HOSTS,
  );

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

  it("should drop chapter links that leave the site", () => {
    const html = `<h1 class="entry-title">Title</h1><div id="chapterlist">
      <li data-num="1"><a href="https://arenascan.com/title-1/">Chapter 1</a></li>
      <li data-num="2"><a href="http://127.0.0.1:8080/admin">Chapter 2</a></li>
      <li data-num="3"><a href="https://other.example/title-3/">Chapter 3</a></li>
      <li data-num="4"><a href="file:///C:/Windows/win.ini">Chapter 4</a></li>
      <li data-num="5"><a href="https://www.arenascan.com/title-5/">Chapter 5</a></li>
    </div>`;

    const parsed = parseSeriesPage(html, SERIES_URL, HOSTS);

    expect(parsed.chapters.map((chapter) => chapter.number)).toEqual([1, 5]);
  });

  it("should keep only the module's hosts when the page URL is another site", () => {
    const html = `<h1 class="entry-title">Title</h1><div id="chapterlist">
      <li data-num="1"><a href="https://evil.example/title-1/">Chapter 1</a></li>
      <li data-num="2"><a href="/title-2/">Chapter 2</a></li>
      <li data-num="3"><a href="https://arenascan.com/title-3/">Chapter 3</a></li>
    </div>`;

    const parsed = parseSeriesPage(
      html,
      "https://evil.example/manga/x/",
      HOSTS,
    );

    expect(parsed.chapters.map((chapter) => chapter.number)).toEqual([3]);
  });

  it("should throw PARSE_FAILED when the chapter list is absurdly long", () => {
    const items = Array.from(
      { length: 10_001 },
      (_value, index) =>
        `<li data-num="${index}"><a href="/c-${index}/">c</a></li>`,
    ).join("");
    const html = `<h1 class="entry-title">Title</h1><div id="chapterlist">${items}</div>`;

    expect(codeOf(() => parseSeriesPage(html, SERIES_URL, HOSTS))).toBe(
      "PARSE_FAILED",
    );
  });

  it("should throw PARSE_FAILED when the title is missing", () => {
    expect(
      codeOf(() => parseSeriesPage("<html></html>", SERIES_URL, HOSTS)),
    ).toBe("PARSE_FAILED");
  });

  it("should throw CHAPTER_LIST_EMPTY when no chapter is listed", () => {
    const html =
      '<h1 class="entry-title">Title</h1><div id="chapterlist"></div>';

    expect(codeOf(() => parseSeriesPage(html, SERIES_URL, HOSTS))).toBe(
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

  it("should drop image links that point at a local address", () => {
    const html = `<div id="readerarea">
      <img src="https://cdn.arenascan.com/a/1.jpg">
      <img src="http://192.168.1.1/a/2.jpg">
      <img src="http://localhost/a/3.jpg">
      <img src="file:///C:/a/4.jpg">
    </div>`;

    const parsed = parseChapterPage(html, CHAPTER_URL);

    expect(parsed.imageUrls).toEqual(["https://cdn.arenascan.com/a/1.jpg"]);
  });

  it("should throw PARSE_FAILED when a chapter lists too many images", () => {
    const images = Array.from(
      { length: 2_001 },
      (_value, index) => `<img src="/a/${index}.jpg">`,
    ).join("");
    const html = `<div id="readerarea">${images}</div>`;

    expect(codeOf(() => parseChapterPage(html, CHAPTER_URL))).toBe(
      "PARSE_FAILED",
    );
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
