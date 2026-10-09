import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError, serializeError, toAppError } from "./errors";
import type { EmitEvent, JobSummary } from "./events";
import {
  loadManifest,
  saveManifest,
  type ChapterRecord,
  type PageRecord,
} from "./manifest";
import { chapterFolderName, pageFileName, seriesDirectory } from "./paths";
import type { ChapterRef, Http, Series, SiteAdapter } from "./types";

export interface DownloadOptions {
  adapter: SiteAdapter;
  series: Series;
  chapters: ChapterRef[];
  outDir: string;
  http: Http;
  imageConcurrency: number;
  emit: EmitEvent;
  signal: AbortSignal;
}

const startsWith = (bytes: Buffer, signature: number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value);

/** Detects the real format from magic bytes; null means the body is not an image. */
export const detectImageExtension = (bytes: Buffer): string | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (bytes.subarray(0, 4).toString("latin1") === "GIF8") return "gif";
  if (
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "webp";
  if (
    bytes.subarray(4, 8).toString("latin1") === "ftyp" &&
    /^avi[fs]$/.test(bytes.subarray(8, 12).toString("latin1"))
  )
    return "avif";
  return null;
};

const fileSize = async (path: string): Promise<number | null> => {
  try {
    return (await stat(path)).size;
  } catch {
    return null;
  }
};

const isCancelled = (error: unknown): boolean =>
  error instanceof AppError && error.code === "CANCELLED";

/** Runs `work` over all items with a fixed number of workers and waits for every worker to settle. */
const runPool = async <T>(
  items: T[],
  concurrency: number,
  work: (item: T) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const item = items[cursor] as T;
      cursor += 1;
      await work(item);
    }
  };
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    worker,
  );
  const results = await Promise.allSettled(workers);
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
};

const isIntact = async (
  chapterDir: string,
  page: PageRecord | undefined,
  url: string,
): Promise<boolean> => {
  if (!page || page.status !== "ok" || page.file === null || page.url !== url)
    return false;
  return (await fileSize(join(chapterDir, page.file))) === page.bytes;
};

const isChapterIntact = async (
  seriesDir: string,
  record: ChapterRecord | undefined,
): Promise<boolean> => {
  if (!record || record.status !== "done" || record.pages.length === 0)
    return false;
  const chapterDir = join(seriesDir, record.folder);
  const checks = await Promise.all(
    record.pages.map((page) => isIntact(chapterDir, page, page.url)),
  );
  return checks.every(Boolean);
};

const assertSameChapter = (
  chapter: ChapterRef,
  pageNumber: number | null,
  finalUrl: string,
): void => {
  if (
    chapter.number === null ||
    pageNumber === null ||
    chapter.number === pageNumber
  )
    return;
  throw new AppError(
    "CHAPTER_MISMATCH",
    `Expected chapter ${chapter.number} but the page is chapter ${pageNumber}`,
    {
      expected: chapter.number,
      actual: pageNumber,
      url: chapter.url,
      finalUrl,
    },
  );
};

interface ChapterContext extends Omit<
  DownloadOptions,
  "chapters" | "series" | "outDir"
> {
  seriesDir: string;
  previous: ChapterRecord | undefined;
}

/**
 * Fills `record` in place so that pages already saved stay recorded even
 * when the job is cancelled halfway through.
 */
const downloadChapter = async (
  chapter: ChapterRef,
  record: ChapterRecord,
  context: ChapterContext,
): Promise<void> => {
  const { adapter, http, imageConcurrency, emit, signal, seriesDir, previous } =
    context;
  const pages = await adapter.getPages(chapter, http);
  assertSameChapter(chapter, pages.pageNumber, pages.finalUrl);
  if (pages.imageUrls.length === 0) {
    throw new AppError(
      "CHAPTER_NO_IMAGES",
      `No images found on ${chapter.url}`,
      { url: chapter.url },
    );
  }

  const chapterDir = join(seriesDir, record.folder);
  await mkdir(chapterDir, { recursive: true });
  record.pages = pages.imageUrls.map((url, index) => ({
    index: index + 1,
    url,
    file: null,
    bytes: 0,
    status: "pending",
  }));
  emit({
    type: "chapter-pages",
    chapterId: chapter.id,
    label: chapter.label,
    pageCount: record.pages.length,
  });

  let finished = 0;
  const total = record.pages.length;
  await runPool(record.pages, imageConcurrency, async (page) => {
    if (signal.aborted) throw new AppError("CANCELLED", "Cancelled by user");
    try {
      const saved = previous?.pages.find(
        (candidate) => candidate.index === page.index,
      );
      const reused = await isIntact(chapterDir, saved, page.url);
      if (reused && saved) {
        page.file = saved.file;
        page.bytes = saved.bytes;
      } else {
        const bytes = await http.getBytes(page.url, pages.referer);
        const extension = detectImageExtension(bytes);
        if (extension === null) {
          throw new AppError(
            "IMAGE_CORRUPT",
            `Response is not an image (${bytes.length} bytes)`,
            { url: page.url, bytes: bytes.length },
          );
        }
        const file = pageFileName(page.index, extension);
        const target = join(chapterDir, file);
        await writeFile(`${target}.part`, bytes);
        await rename(`${target}.part`, target);
        page.file = file;
        page.bytes = bytes.length;
      }
      page.status = "ok";
      finished += 1;
      emit({
        type: "page-done",
        chapterId: chapter.id,
        pageIndex: page.index,
        done: finished,
        total,
        bytes: page.bytes,
        reused,
      });
    } catch (error) {
      if (isCancelled(error)) throw error;
      page.status = "failed";
      page.error = serializeError(error);
      emit({
        type: "page-failed",
        chapterId: chapter.id,
        label: chapter.label,
        pageIndex: page.index,
        url: page.url,
        error: page.error,
      });
    }
  });
};

const settleStatus = (record: ChapterRecord): void => {
  const okPages = record.pages.filter((page) => page.status === "ok").length;
  if (record.error) record.status = okPages > 0 ? "incomplete" : "failed";
  else if (okPages === record.pages.length && okPages > 0)
    record.status = "done";
  else record.status = okPages > 0 ? "incomplete" : "failed";
  record.updatedAt = new Date().toISOString();
};

export const downloadChapters = async (
  options: DownloadOptions,
): Promise<JobSummary> => {
  const { series, chapters, outDir, emit, signal } = options;
  const seriesDir = seriesDirectory(outDir, series);
  await mkdir(seriesDir, { recursive: true });
  const manifest = await loadManifest(seriesDir, series);
  const summary: JobSummary = {
    seriesDir,
    requested: chapters.length,
    done: 0,
    skipped: 0,
    incomplete: 0,
    failed: 0,
    cancelled: false,
    failures: [],
  };
  emit({
    type: "job-start",
    seriesTitle: series.title,
    seriesDir,
    chapterCount: chapters.length,
  });

  for (const [position, chapter] of chapters.entries()) {
    if (signal.aborted) {
      summary.cancelled = true;
      break;
    }
    emit({
      type: "chapter-start",
      chapterId: chapter.id,
      label: chapter.label,
      position: position + 1,
      total: chapters.length,
    });

    const previous = manifest.chapters[chapter.id];
    if (await isChapterIntact(seriesDir, previous)) {
      const pageCount = previous?.pages.length ?? 0;
      summary.skipped += 1;
      emit({
        type: "chapter-done",
        chapterId: chapter.id,
        label: chapter.label,
        status: "skipped",
        okPages: pageCount,
        totalPages: pageCount,
        error: null,
      });
      continue;
    }

    const record: ChapterRecord = {
      id: chapter.id,
      number: chapter.number,
      label: chapter.label,
      url: chapter.url,
      folder: chapterFolderName(chapter),
      status: "failed",
      pages: [],
      updatedAt: new Date().toISOString(),
    };
    try {
      await downloadChapter(chapter, record, {
        ...options,
        seriesDir,
        previous,
      });
    } catch (error) {
      if (isCancelled(error)) summary.cancelled = true;
      record.error = serializeError(toAppError(error));
    }
    settleStatus(record);
    manifest.chapters[chapter.id] = record;
    await saveManifest(seriesDir, manifest);

    const failedPages = record.pages
      .filter((page) => page.status === "failed")
      .map((page) => page.index);
    const okPages = record.pages.filter((page) => page.status === "ok").length;
    summary[record.status] += 1;
    if (record.status !== "done") {
      summary.failures.push({
        chapterId: chapter.id,
        label: chapter.label,
        status: record.status,
        error: record.error ?? null,
        failedPages,
      });
    }
    emit({
      type: "chapter-done",
      chapterId: chapter.id,
      label: chapter.label,
      status: record.status,
      okPages,
      totalPages: record.pages.length,
      error: record.error ?? null,
    });
    if (summary.cancelled) break;
  }

  emit({ type: "job-done", summary });
  return summary;
};
