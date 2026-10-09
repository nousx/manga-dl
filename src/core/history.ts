import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { AppError } from "./errors";
import type { ChapterStatus } from "./manifest";

export interface HistoryChapter {
  id: string;
  label: string;
  number: number | null;
  status: ChapterStatus;
  pages: number;
  totalPages: number;
}

export interface HistorySeries {
  id: string;
  title: string;
  siteId: string;
  url: string;
  updatedAt: string;
  complete: number;
  incomplete: number;
  failed: number;
  pages: number;
  totalPages: number;
  chapters: HistoryChapter[];
}

export interface HistoryIssue {
  location: string;
  reason: "missing" | "unreadable" | "malformed" | "unsafe";
}

export interface HistoryResult {
  series: HistorySeries[];
  issues: HistoryIssue[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
const date = (value: unknown): value is string =>
  text(value) && Number.isFinite(Date.parse(value));
const webUrl = (value: unknown): value is string => {
  if (!text(value)) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** Pure projection of untrusted disk JSON into the small renderer-facing model. */
export const summarizeManifest = (
  value: unknown,
  id: string,
): HistorySeries | null => {
  if (
    !object(value) ||
    value.version !== 1 ||
    !text(value.title) ||
    !text(value.siteId) ||
    !webUrl(value.url) ||
    !date(value.updatedAt) ||
    !object(value.chapters)
  )
    return null;
  const chapters: HistoryChapter[] = [];
  for (const [key, chapter] of Object.entries(value.chapters)) {
    if (
      !object(chapter) ||
      chapter.id !== key ||
      !text(chapter.label) ||
      !(
        chapter.number === null ||
        (typeof chapter.number === "number" && Number.isFinite(chapter.number))
      ) ||
      !["done", "incomplete", "failed"].includes(String(chapter.status)) ||
      !Array.isArray(chapter.pages)
    )
      return null;
    if (
      !chapter.pages.every(
        (page: unknown) =>
          object(page) &&
          ["pending", "ok", "failed"].includes(String(page.status)),
      )
    )
      return null;
    chapters.push({
      id: key,
      label: chapter.label,
      number: chapter.number,
      status: chapter.status as ChapterStatus,
      totalPages: chapter.pages.length,
      pages: chapter.pages.filter(
        (page: { status: string }) => page.status === "ok",
      ).length,
    });
  }
  chapters.sort(
    (a, b) =>
      (a.number ?? Infinity) - (b.number ?? Infinity) ||
      a.label.localeCompare(b.label),
  );
  return {
    id,
    title: value.title,
    siteId: value.siteId,
    url: value.url,
    updatedAt: value.updatedAt,
    complete: chapters.filter((chapter) => chapter.status === "done").length,
    incomplete: chapters.filter((chapter) => chapter.status === "incomplete")
      .length,
    failed: chapters.filter((chapter) => chapter.status === "failed").length,
    pages: chapters.reduce((sum, chapter) => sum + chapter.pages, 0),
    totalPages: chapters.reduce((sum, chapter) => sum + chapter.totalPages, 0),
    chapters,
  };
};

const inside = (root: string, target: string): boolean => {
  const path = relative(root, target);
  return (
    path !== "" &&
    path !== ".." &&
    !path.startsWith(`..${sep}`) &&
    !isAbsolute(path)
  );
};
const entryId = (path: string): string =>
  createHash("sha256").update(path).digest("hex");
const reasonOf = (error: unknown): HistoryIssue["reason"] =>
  object(error) && error.code === "ENOENT" ? "missing" : "unreadable";

/** Node-only disk boundary. Never follows directory junctions or manifest symlinks. */
const scan = async (
  outDir: string,
): Promise<HistoryResult & { folders: Map<string, string> }> => {
  const result: HistoryResult & { folders: Map<string, string> } = {
    series: [],
    issues: [],
    folders: new Map(),
  };
  try {
    const root = await realpath(outDir);
    const sites = await readdir(root, { withFileTypes: true });
    for (const site of sites) {
      if (site.name === "logs") continue;
      if (site.isSymbolicLink()) {
        result.issues.push({ location: site.name, reason: "unsafe" });
        continue;
      }
      if (!site.isDirectory()) continue;
      try {
        const siteDir = await realpath(join(root, site.name));
        if (!inside(root, siteDir)) {
          result.issues.push({ location: site.name, reason: "unsafe" });
          continue;
        }
        for (const entry of await readdir(siteDir, { withFileTypes: true })) {
          const location = `${site.name}/${entry.name}`;
          if (entry.isSymbolicLink()) {
            result.issues.push({ location, reason: "unsafe" });
            continue;
          }
          if (!entry.isDirectory()) continue;
          try {
            const folder = await realpath(join(siteDir, entry.name));
            if (!inside(root, folder)) {
              result.issues.push({ location, reason: "unsafe" });
              continue;
            }
            const manifestPath = join(folder, "manifest.json");
            const stat = await lstat(manifestPath);
            if (
              stat.isSymbolicLink() ||
              !stat.isFile() ||
              !inside(root, await realpath(manifestPath))
            ) {
              result.issues.push({ location, reason: "unsafe" });
              continue;
            }
            if (stat.size > 16 * 1024 * 1024) {
              result.issues.push({ location, reason: "malformed" });
              continue;
            }
            const raw = await readFile(manifestPath, "utf8");
            const parsed = (() => {
              try {
                return JSON.parse(raw) as unknown;
              } catch {
                return null;
              }
            })();
            const id = entryId(relative(root, folder));
            const summary = summarizeManifest(parsed, id);
            if (!summary || summary.siteId !== site.name) {
              result.issues.push({ location, reason: "malformed" });
              continue;
            }
            result.series.push(summary);
            result.folders.set(id, folder);
          } catch (error) {
            // a folder with no manifest yet is a download in progress, not a problem
            if (reasonOf(error) !== "missing")
              result.issues.push({ location, reason: reasonOf(error) });
          }
        }
      } catch (error) {
        result.issues.push({ location: site.name, reason: reasonOf(error) });
      }
    }
  } catch (error) {
    result.issues.push({ location: ".", reason: reasonOf(error) });
  }
  result.series.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  return result;
};

export const scanHistory = async (outDir: string): Promise<HistoryResult> => {
  const { series, issues } = await scan(outDir);
  return { series, issues };
};

/** Re-scan on each open, so stale IDs and changed output roots cannot grant access. */
export const resolveHistoryFolder = async (
  outDir: string,
  id: unknown,
): Promise<string> => {
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id))
    throw new AppError("INVALID_INPUT", "Invalid history id");
  const folder = (await scan(outDir)).folders.get(id);
  if (!folder)
    throw new AppError(
      "INVALID_INPUT",
      "History entry no longer exists in the output folder",
    );
  return folder;
};
