import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors";
import { chapterFolderName, sanitizeName } from "../src/core/paths";
import { resolveSite } from "../src/core/registry";
import { findMissingNumbers } from "../src/core/series";
import type { ChapterRef } from "../src/core/types";
import { siteAdapters } from "../src/sites";

const chapter = (
  number: number | null,
  id = `chapter-${number}`,
): ChapterRef => ({
  id,
  number,
  label: `Chapter ${number}`,
  url: `https://example.com/${id}/`,
  date: null,
});

const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

describe("findMissingNumbers", () => {
  it("should return nothing when the list is continuous", () => {
    expect(findMissingNumbers([1, 2, 3].map((n) => chapter(n)))).toEqual([]);
  });

  it("should report gaps in the middle", () => {
    expect(findMissingNumbers([1, 2, 5].map((n) => chapter(n)))).toEqual([
      3, 4,
    ]);
  });

  it("should report chapters missing from the start", () => {
    expect(findMissingNumbers([3, 4].map((n) => chapter(n)))).toEqual([1, 2]);
  });

  it("should treat a decimal chapter as covering its whole number", () => {
    expect(findMissingNumbers([1, 2.5, 3].map((n) => chapter(n)))).toEqual([]);
  });

  it("should return nothing when no chapter has a number", () => {
    expect(findMissingNumbers([chapter(null, "extra")])).toEqual([]);
  });
});

describe("chapterFolderName", () => {
  it("should name the folder after the chapter number", () => {
    expect(chapterFolderName(chapter(12))).toBe("Chapter 12");
  });

  it("should keep chapter zero when a series starts with a prologue", () => {
    expect(chapterFolderName(chapter(0))).toBe("Chapter 0");
  });

  it("should keep the decimal part", () => {
    expect(chapterFolderName(chapter(12.5))).toBe("Chapter 12.5");
  });

  it("should fall back to the id when there is no number", () => {
    expect(chapterFolderName(chapter(null, "side-story"))).toBe("side-story");
  });
});

describe("sanitizeName", () => {
  it("should strip characters Windows forbids", () => {
    expect(sanitizeName('Re: Zero / "Arc" 2?')).toBe("Re Zero Arc 2");
  });

  it("should drop trailing dots and spaces", () => {
    expect(sanitizeName("Title... ")).toBe("Title");
  });

  it("should guard reserved device names", () => {
    expect(sanitizeName("CON")).toBe("_CON");
  });

  it("should never return an empty name", () => {
    expect(sanitizeName("???")).toBe("untitled");
  });
});

describe("resolveSite", () => {
  it("should pick the adapter that matches the host", () => {
    const { adapter } = resolveSite(
      siteAdapters,
      "https://arenascan.com/manga/some-series/",
    );

    expect(adapter.id).toBe("arenascan");
  });

  it("should throw INVALID_URL for text that is not a URL", () => {
    expect(codeOf(() => resolveSite(siteAdapters, "not a url"))).toBe(
      "INVALID_URL",
    );
  });

  it("should throw INVALID_URL for non-http protocols", () => {
    expect(codeOf(() => resolveSite(siteAdapters, "file:///c:/x"))).toBe(
      "INVALID_URL",
    );
  });

  it("should throw UNSUPPORTED_SITE for an unknown host", () => {
    expect(
      codeOf(() => resolveSite(siteAdapters, "https://example.com/a")),
    ).toBe("UNSUPPORTED_SITE");
  });
});
