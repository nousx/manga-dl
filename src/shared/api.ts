import type { SerializedError } from "../core/errors";
import type { DownloadEvent } from "../core/events";
import type { ChapterStatus } from "../core/manifest";
import type { Series } from "../core/types";
import type { HistoryResult } from "../core/history";
export type {
  HistoryResult,
  HistorySeries,
  HistoryChapter,
} from "../core/history";

export type { ErrorCode, SerializedError } from "../core/errors";
export type { ChapterFailure, DownloadEvent, JobSummary } from "../core/events";
export type { ChapterStatus } from "../core/manifest";
export type { ChapterRef, Series } from "../core/types";

export type Result<T> =
  { ok: true; data: T } | { ok: false; error: SerializedError };

export interface SavedChapter {
  status: ChapterStatus;
  okPages: number;
  totalPages: number;
}

export interface SeriesInfo extends Series {
  seriesDir: string;
  /** What is already on disk, keyed by chapter id. */
  saved: Record<string, SavedChapter>;
}

export interface Settings {
  outDir: string;
  imageConcurrency: number;
  requestDelayMs: number;
}

export interface SiteInfo {
  id: string;
  name: string;
  domains: string[];
  exampleUrl: string;
  engine: string;
}

export type FolderTarget = "output" | "series" | "logs";

export const SETTING_LIMITS = {
  imageConcurrency: { min: 1, max: 8 },
  requestDelayMs: { min: 0, max: 5000 },
} as const;

/** Everything the renderer may ask the main process to do. */
export interface MangaApi {
  listHistory(): Promise<Result<HistoryResult>>;
  openHistoryFolder(id: string): Promise<Result<null>>;
  listSites(): Promise<Result<SiteInfo[]>>;
  fetchSeries(url: string): Promise<Result<SeriesInfo>>;
  startDownload(chapterIds: string[]): Promise<Result<null>>;
  cancelDownload(): Promise<Result<null>>;
  getSettings(): Promise<Result<Settings>>;
  updateSettings(patch: Partial<Settings>): Promise<Result<Settings>>;
  pickOutputFolder(): Promise<Result<Settings>>;
  openFolder(target: FolderTarget): Promise<Result<null>>;
  onDownloadEvent(listener: (event: DownloadEvent) => void): () => void;
}

export const CHANNELS = {
  listHistory: "history:list",
  openHistoryFolder: "history:open-folder",
  listSites: "sites:list",
  fetchSeries: "series:fetch",
  startDownload: "download:start",
  cancelDownload: "download:cancel",
  getSettings: "settings:get",
  updateSettings: "settings:update",
  pickOutputFolder: "settings:pick-folder",
  openFolder: "shell:open-folder",
  downloadEvent: "download:event",
} as const;
