import type { SerializedError } from "./errors";
import type { ChapterStatus } from "./manifest";

export interface ChapterFailure {
  chapterId: string;
  label: string;
  status: ChapterStatus;
  error: SerializedError | null;
  failedPages: number[];
}

export interface JobSummary {
  seriesDir: string;
  requested: number;
  done: number;
  skipped: number;
  incomplete: number;
  failed: number;
  cancelled: boolean;
  failures: ChapterFailure[];
}

export type DownloadEvent =
  | {
      type: "job-start";
      seriesTitle: string;
      seriesDir: string;
      chapterCount: number;
    }
  | {
      type: "chapter-start";
      chapterId: string;
      label: string;
      position: number;
      total: number;
    }
  | {
      type: "chapter-pages";
      chapterId: string;
      label: string;
      pageCount: number;
    }
  | {
      type: "page-done";
      chapterId: string;
      pageIndex: number;
      done: number;
      total: number;
      bytes: number;
      reused: boolean;
    }
  | {
      type: "page-failed";
      chapterId: string;
      label: string;
      pageIndex: number;
      url: string;
      error: SerializedError;
    }
  | {
      type: "chapter-done";
      chapterId: string;
      label: string;
      status: ChapterStatus | "skipped";
      okPages: number;
      totalPages: number;
      error: SerializedError | null;
    }
  | {
      type: "retry";
      url: string;
      attempt: number;
      maxAttempts: number;
      reason: string;
      waitMs: number;
    }
  | { type: "job-done"; summary: JobSummary }
  | { type: "job-error"; error: SerializedError };

export type EmitEvent = (event: DownloadEvent) => void;
