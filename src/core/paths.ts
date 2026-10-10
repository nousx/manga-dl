import { join } from "node:path";
import type { ChapterRef, Series } from "./types";

const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_NAME_LENGTH = 80;

/** Makes a string safe to use as a single Windows/macOS/Linux path segment. */
export const sanitizeName = (name: string): string => {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[. ]+$/, "");
  if (cleaned === "") return "untitled";
  return RESERVED_NAMES.test(cleaned) ? `_${cleaned}` : cleaned;
};

/**
 * Folder name for one chapter: 12 -> "Chapter 12", 12.5 -> "Chapter 12.5".
 * Always English so a folder never depends on the interface language.
 * Reading order relies on natural sorting (Explorer and MangaX both do it).
 */
export const chapterFolderName = (
  chapter: Pick<ChapterRef, "id" | "number">,
): string =>
  chapter.number === null
    ? sanitizeName(chapter.id)
    : `Chapter ${chapter.number}`;

export const pageFileName = (pageIndex: number, extension: string): string =>
  `${String(pageIndex).padStart(3, "0")}.${extension}`;

export const seriesDirectory = (
  outDir: string,
  series: Pick<Series, "siteId" | "title">,
): string =>
  join(outDir, sanitizeName(series.siteId), sanitizeName(series.title));
