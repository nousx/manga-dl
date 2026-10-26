import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSite } from "../src/core/registry";
import { siteAdapters } from "../src/sites";
import {
  comix,
  comixPageUrl,
  parseComixChapterPage,
  parseComixSeriesPage,
} from "../src/sites/comix";
import type { Http } from "../src/core/types";

const SERIES = "https://comix.to/title/gmv6g-can-life-be-monetized";
const CHAPTER = `${SERIES}/11449300-chapter-1`;
const fixture = (kind: string): string =>
  readFileSync(
    join(import.meta.dirname, "fixtures", `comix-${kind}.html`),
    "utf8",
  );
const initial = (chapterId = 11449300): string =>
  `<script id="initial-data" type="application/json">${JSON.stringify({
    queries: {
      [JSON.stringify(["manga", "detail", "gmv6g"])]: {
        hid: "gmv6g",
        title: "Can Life Be Monetized?",
      },
    },
    read: { mangaHid: "gmv6g", chapterId, chapterNumber: 1 },
  })}</script>`;
const row = (
  id: number,
  number: number,
  group: string,
): string => `<li class="mchap-item">
  <a class="mchap-row__primary" href="${SERIES}/${id}-chapter-${number}"><span class="mchap-row__ch">Ch.${number}</span></a>
  <span class="mchap-row__group">${group}</span></li>`;
const page = (
  number: number,
  src = `https://images.example.org/${number}.webp`,
): string =>
  `<div class="rpage-page" data-page="${number}"><img class="rpage-page__img" src="${src}"></div>`;
const httpWith = (text: string, finalUrl?: string): Http => ({
  getText: async (url) => ({ text, finalUrl: finalUrl ?? url }),
  getBytes: async () => Buffer.alloc(0),
});

describe("Comix URL boundary", () => {
  it("should resolve Comix when the user supplies a supported title", () => {
    const result = resolveSite(siteAdapters, SERIES);

    expect(result.adapter.id).toBe("comix");
  });

  it.each([
    "https://comix.to.evil.example/title/gmv6g-test",
    "https://user:secret@comix.to/title/gmv6g-test",
    "http://127.0.0.1/title/gmv6g-test",
    "file:///C:/Windows/win.ini",
    "https://comix.to/api/v1/user",
    "https://comix.to:8443/title/gmv6g-test",
  ])("should reject unsafe input when given %s", (url) => {
    expect(() => comixPageUrl(url)).toThrow(
      "Expected a Comix title or chapter page",
    );
  });
});

describe("Comix series", () => {
  it("should read the complete series when given a rendered live snapshot", () => {
    const result = parseComixSeriesPage(fixture("series"), SERIES);

    expect(result.title).toBe("Can Life Be Monetized?");
    expect(result.chapters.map((chapter) => chapter.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("should prefer the most complete group when translations share chapter numbers", () => {
    const html =
      initial() + row(1, 1, "Other") + row(2, 1, "Main") + row(3, 2, "Main");

    const result = parseComixSeriesPage(html, SERIES);

    expect(result.chapters.map((chapter) => chapter.id)).toEqual(["2", "3"]);
  });

  it("should retain missing numbers from other groups when the main group has a gap", () => {
    const html =
      initial() + row(1, 1, "Main") + row(2, 2, "Main") + row(3, 3, "Other");

    const result = parseComixSeriesPage(html, SERIES);

    expect(result.chapters.map((chapter) => chapter.number)).toEqual([1, 2, 3]);
  });

  it("should ignore another series when a row links outside the requested title", () => {
    const html =
      initial() +
      row(1, 1, "Main") +
      row(2, 2, "Main").replace("gmv6g-can-life-be-monetized", "other-title");

    const result = parseComixSeriesPage(html, SERIES);

    expect(result.chapters).toHaveLength(1);
  });

  it("should reject unrendered pages when the chapter list is not available", () => {
    expect(() => parseComixSeriesPage(initial(), SERIES)).toThrow(
      "requires the browser reader",
    );
  });

  it("should reject invalid JSON when the bootstrap document is malformed", () => {
    expect(() =>
      parseComixSeriesPage('<script id="initial-data">{</script>', SERIES),
    ).toThrow("initial data is missing");
  });

  it("should reject title mismatches when the source returns another manga", () => {
    const html = initial().replaceAll("gmv6g", "other") + row(1, 1, "Main");

    expect(() => parseComixSeriesPage(html, SERIES)).toThrow("does not match");
  });

  it("should report chapter gaps when loading a sparse series", async () => {
    const http = httpWith(initial() + row(1, 1, "Main") + row(3, 3, "Main"));

    const result = await comix.getSeries(new URL(SERIES), http);

    expect(result.missingNumbers).toEqual([2]);
  });

  it("should reject off-site redirects when the requested series leaves Comix", async () => {
    const http = httpWith(initial(), "https://evil.example/title/gmv6g-test");

    await expect(comix.getSeries(new URL(SERIES), http)).rejects.toMatchObject({
      code: "UNSAFE_URL",
    });
  });
});

describe("Comix chapter", () => {
  it("should return every image when given a rendered live chapter", () => {
    const result = parseComixChapterPage(fixture("chapter"), CHAPTER);

    expect(result.imageUrls).toHaveLength(154);
    expect(result.pageNumber).toBe(1);
  });

  it("should order images by page number when the DOM is unordered", () => {
    const result = parseComixChapterPage(
      initial() + page(2) + page(1),
      CHAPTER,
    );

    expect(result.imageUrls).toEqual([
      "https://images.example.org/1.webp",
      "https://images.example.org/2.webp",
    ]);
  });

  it("should reject missing image URLs when a page has not rendered", () => {
    const html = initial() + '<div class="rpage-page" data-page="1"></div>';

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "page is missing",
    );
  });

  it("should reject canvas pages when the source requires protected rendering", () => {
    const html =
      initial() +
      '<div class="rpage-page" data-page="1"><canvas></canvas></div>';

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "page is missing, protected",
    );
  });

  it("should reject private network images when page data contains an unsafe URL", () => {
    const html = initial() + page(1, "http://192.168.1.1/private.jpg");

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "unsafe image URL",
    );
  });

  it("should reject duplicate indices when the reader repeats a page number", () => {
    const html = initial() + page(1) + page(1);

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "page is missing",
    );
  });

  it("should reject missing indices when the reader omits a page", () => {
    const html = initial() + page(1) + page(3);

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "page sequence is incomplete",
    );
  });

  it("should reject chapter mismatches when bootstrap data identifies another chapter", () => {
    const html = initial(12345) + page(1);

    expect(() => parseComixChapterPage(html, CHAPTER)).toThrow(
      "different chapter",
    );
  });

  it("should omit the Referer when the source reader uses no-referrer images", async () => {
    const chapter = parseComixSeriesPage(
      initial() + row(11449300, 1, "Main"),
      SERIES,
    ).chapters[0]!;

    const result = await comix.getPages(chapter, httpWith(initial() + page(1)));

    expect(result.referer).toBe("");
  });
});
