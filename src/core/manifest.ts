import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SerializedError } from "./errors";
import type { Series } from "./types";

export const MANIFEST_FILE = "manifest.json";

export type PageStatus = "pending" | "ok" | "failed";
export type ChapterStatus = "done" | "incomplete" | "failed";

export interface PageRecord {
  /** 1-based reading order. */
  index: number;
  url: string;
  file: string | null;
  bytes: number;
  status: PageStatus;
  error?: SerializedError;
}

export interface ChapterRecord {
  id: string;
  number: number | null;
  label: string;
  url: string;
  folder: string;
  status: ChapterStatus;
  pages: PageRecord[];
  error?: SerializedError;
  updatedAt: string;
}

export interface Manifest {
  version: 1;
  siteId: string;
  title: string;
  url: string;
  updatedAt: string;
  chapters: Record<string, ChapterRecord>;
}

const emptyManifest = (series: Series): Manifest => ({
  version: 1,
  siteId: series.siteId,
  title: series.title,
  url: series.url,
  updatedAt: new Date().toISOString(),
  chapters: {},
});

/** Returns a fresh manifest when none exists yet or the file is unreadable. */
export const loadManifest = async (
  seriesDir: string,
  series: Series,
): Promise<Manifest> => {
  try {
    const parsed = JSON.parse(
      await readFile(join(seriesDir, MANIFEST_FILE), "utf8"),
    ) as Manifest;
    if (
      parsed.version === 1 &&
      typeof parsed.chapters === "object" &&
      parsed.chapters !== null
    )
      return parsed;
  } catch {
    // missing or corrupt manifest: files on disk get re-verified page by page anyway
  }
  return emptyManifest(series);
};

export const saveManifest = async (
  seriesDir: string,
  manifest: Manifest,
): Promise<void> => {
  const target = join(seriesDir, MANIFEST_FILE);
  const temporary = `${target}.tmp`;
  manifest.updatedAt = new Date().toISOString();
  await writeFile(temporary, JSON.stringify(manifest, null, 2), "utf8");
  await rename(temporary, target);
};
