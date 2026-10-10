import type { DownloadEvent, SerializedError } from "../../shared/api";
import type { Messages } from "./i18n";

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  text: string;
  detail?: string;
}

export const errorTitle = (error: SerializedError, m: Messages): string =>
  m.errors[error.code].title;

export const errorHint = (error: SerializedError, m: Messages): string =>
  m.errors[error.code].hint;

/** Technical line shown under the translated explanation: code plus the raw message. */
export const errorDetail = (error: SerializedError): string =>
  `[${error.code}] ${error.message}`;

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;

type Line = Omit<LogEntry, "id" | "time">;

/** Turns a core event into a log line; returns null for events too noisy to list. */
export const describeEvent = (
  event: DownloadEvent,
  m: Messages,
): Line | null => {
  switch (event.type) {
    case "job-start":
      return {
        level: "info",
        text: m.log.jobStart(event.seriesTitle, event.chapterCount),
        detail: event.seriesDir,
      };
    case "chapter-pages":
      return {
        level: "info",
        text: m.log.chapterPages(event.label, event.pageCount),
      };
    case "page-failed":
      return {
        level: "error",
        text: m.log.pageFailed(
          event.label,
          event.pageIndex,
          errorTitle(event.error, m),
        ),
        detail: `${errorDetail(event.error)}\n${event.url}`,
      };
    case "retry":
      return {
        level: "warn",
        text: m.log.retry(
          event.attempt,
          event.maxAttempts - 1,
          Math.round(event.waitMs / 1000),
        ),
        detail: event.reason,
      };
    case "chapter-done": {
      const pages = m.common.pages(event.okPages, event.totalPages);
      if (event.status === "done") {
        return {
          level: "success",
          text: m.log.chapterDone(event.label, pages),
        };
      }
      if (event.status === "skipped") {
        return {
          level: "info",
          text: m.log.chapterSkipped(event.label, pages),
        };
      }
      const reason = event.error
        ? errorTitle(event.error, m)
        : m.log.somePagesFailed;
      return {
        level: "error",
        text:
          event.status === "incomplete"
            ? m.log.chapterIncomplete(event.label, pages, reason)
            : m.log.chapterFailed(event.label, reason),
        detail: event.error
          ? `${errorDetail(event.error)}\n${errorHint(event.error, m)}`
          : undefined,
      };
    }
    case "job-done": {
      const { summary } = event;
      const problems = summary.incomplete + summary.failed;
      return {
        level: summary.cancelled || problems > 0 ? "warn" : "success",
        text: m.log.jobDone(summary.cancelled, summary),
      };
    }
    case "job-error":
      return {
        level: "error",
        text: m.log.jobError(errorTitle(event.error, m)),
        detail: `${errorDetail(event.error)}\n${errorHint(event.error, m)}`,
      };
    case "chapter-start":
    case "page-done":
      return null;
  }
};
