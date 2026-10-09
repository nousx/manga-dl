import type { ChapterRef } from "./types";

/**
 * Whole chapter numbers missing from the list. Counting starts at 1 unless
 * the series has a chapter 0, so a site that lost its first chapters is reported too.
 */
export const findMissingNumbers = (chapters: ChapterRef[]): number[] => {
  const present = new Set<number>();
  for (const { number } of chapters) {
    if (number !== null) present.add(Math.floor(number));
  }
  if (present.size === 0) return [];
  const first = present.has(0) ? 0 : 1;
  const last = Math.max(...present);
  const missing: number[] = [];
  for (let current = first; current <= last; current += 1) {
    if (!present.has(current)) missing.push(current);
  }
  return missing;
};

export const sortChapters = (chapters: ChapterRef[]): ChapterRef[] =>
  [...chapters].sort(
    (a, b) => (a.number ?? Number.MAX_VALUE) - (b.number ?? Number.MAX_VALUE),
  );
