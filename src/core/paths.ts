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
 * Folder name for one chapter. Zero padded so folders sort in reading order
 * in any file explorer: 12 -> "0012", 12.5 -> "0012.5".
 */
export const chapterFolderName = (chapter: ChapterRef): string => {
  if (chapter.number === null) return sanitizeName(chapter.id);
  const [whole = "0", fraction] = String(chapter.number).split(".");
  const padded = whole.padStart(4, "0");
  return fraction === undefined ? padded : `${padded}.${fraction}`;
};

export const pageFileName = (pageIndex: number, extension: string): string =>
  `${String(pageIndex).padStart(3, "0")}.${extension}`;

export const seriesDirectory = (
  outDir: string,
  series: Pick<Series, "siteId" | "title">,
): string =>
  join(outDir, sanitizeName(series.siteId), sanitizeName(series.title));
