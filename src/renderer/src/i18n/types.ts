import type { ErrorCode, HistoryResult } from "../../../shared/api";
import type { ChapterUiStatus } from "../useDownloader";

type IssueReason = HistoryResult["issues"][number]["reason"];

export interface Counts {
  done: number;
  skipped: number;
  incomplete: number;
  failed: number;
}

/**
 * Every piece of interface text. Each language file must satisfy this type,
 * so a missing translation is a compile error rather than a blank label.
 */
export interface Messages {
  /** BCP 47 tag used for dates and times. */
  intlLocale: string;
  nav: { label: string; download: string; history: string; sites: string };
  pageTitle: { download: string; history: string; sites: string };
  working: string;
  common: {
    close: string;
    clear: string;
    openSeriesFolder: string;
    pages: (done: number, total: number) => string;
  };
  sidebar: {
    downloading: string;
    chapters: (done: number, total: number) => string;
    viewProgress: string;
    ready: string;
    readyHint: string;
  };
  settings: {
    summary: string;
    summaryDetail: (images: number, delayMs: number) => string;
    saveTo: string;
    change: string;
    openFolder: string;
    concurrencyBefore: string;
    concurrencyAfter: string;
    delay: string;
    language: string;
  };
  empty: { title: string; line1: string; line2: string; viewSites: string };
  url: { label: string; placeholder: string; fetch: string; fetching: string };
  status: Record<ChapterUiStatus, string>;
  series: {
    meta: (site: string, total: number, done: number) => string;
    gaps: (count: number, listed: string, more: number) => string;
    selectAll: string;
    selectUnfinished: string;
    rangeLabel: string;
    selectRange: string;
    cancel: string;
    download: (count: number) => string;
    overallProgress: string;
    jobProgress: (finished: number, total: number, size: string) => string;
  };
  summary: {
    line: (cancelled: boolean, counts: Counts) => string;
    failedPages: (count: number, list: string) => string;
    selectFailures: string;
  };
  log: {
    title: string;
    errorCount: (count: number) => string;
    problemsOnly: string;
    logFiles: string;
    previous: string;
    next: string;
    range: (from: number, to: number, total: number) => string;
    follow: string;
    empty: string;
    jobStart: (title: string, count: number) => string;
    chapterPages: (label: string, count: number) => string;
    pageFailed: (label: string, index: number, reason: string) => string;
    retry: (attempt: number, max: number, seconds: number) => string;
    chapterDone: (label: string, pages: string) => string;
    chapterSkipped: (label: string, pages: string) => string;
    chapterIncomplete: (label: string, pages: string, reason: string) => string;
    chapterFailed: (label: string, reason: string) => string;
    somePagesFailed: string;
    jobDone: (cancelled: boolean, counts: Counts) => string;
    jobError: (reason: string) => string;
  };
  history: {
    heading: string;
    description: string;
    refresh: string;
    reading: string;
    currentFolder: string;
    readingHistory: string;
    issues: (count: number) => string;
    reasons: Record<IssueReason, string>;
    emptyTitle: string;
    emptyLine1: string;
    emptyLine2: string;
    goDownload: string;
    caption: (count: number) => string;
    complete: (count: number) => string;
    incomplete: (count: number) => string;
    failed: (count: number) => string;
    continueSeries: string;
    waitForJob: string;
  };
  sites: {
    heading: string;
    description: string;
    count: (count: number) => string;
    supported: string;
    engine: string;
    exampleLink: string;
    tryExample: string;
    copyLink: string;
    copied: string;
    copyFailed: string;
    waitForJob: string;
    addTitle: string;
    /** Text around the two code paths: before, between, after. */
    addBefore: string;
    addBetween: string;
    addAfter: string;
    addShared: string;
  };
  update: {
    checking: string;
    upToDate: string;
    downloading: (version: string, percent: number) => string;
    ready: (version: string) => string;
    restart: string;
    check: string;
    failed: string;
    portable: string;
    development: string;
    openReleases: string;
  };
  errors: Record<ErrorCode, { title: string; hint: string }>;
}
