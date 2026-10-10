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
 * True for a single path segment: no separators and no way up or sideways.
 * Names read back from a manifest go through this before they touch a path.
 */
export const isPlainName = (name: unknown): name is string =>
  typeof name === "string" &&
  name !== "" &&
  name !== "." &&
  name !== ".." &&
  !["/", "\\", ":"].some((separator) => name.includes(separator));

/**
 * Folder name for one chapter: 12 -> "Chapter 12", 12.5 -> "Chapter 12.5".
 * Always English so a folder never depends on the interface language.
 * Reading order relies on natural sorting (Explorer and MangaX both do it).
 */
export const chapterFolderName = (
  chapter: Pick<ChapterRef, "id" | "number">,
): string =>
  // the number can come from a manifest on disk, so its type is checked here
  typeof chapter.number === "number" && Number.isFinite(chapter.number)
    ? `Chapter ${chapter.number}`
    : sanitizeName(String(chapter.id));

export const pageFileName = (pageIndex: number, extension: string): string =>
  `${String(pageIndex).padStart(3, "0")}.${extension}`;

export const seriesDirectory = (
  outDir: string,
  series: Pick<Series, "siteId" | "title">,
): string =>
  join(outDir, sanitizeName(series.siteId), sanitizeName(series.title));
