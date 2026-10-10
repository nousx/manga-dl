import { useEffect, useRef, useState } from "react";
import type {
  DownloadEvent,
  JobSummary,
  SerializedError,
  SeriesInfo,
  Settings,
} from "../../shared/api";
import { pickLocale } from "../../shared/locale";
import { MESSAGES, type Messages } from "./i18n";
import { describeEvent, type LogEntry } from "./text";

export type ChapterUiStatus =
  "none" | "queued" | "running" | "done" | "incomplete" | "failed";

export interface ChapterProgress {
  status: ChapterUiStatus;
  done: number;
  total: number;
}

export interface JobProgress {
  finished: number;
  total: number;
  bytes: number;
}

export interface Downloader {
  series: SeriesInfo | null;
  settings: Settings | null;
  /** Text for the chosen language; the system language until settings load. */
  messages: Messages;
  loading: boolean;
  running: boolean;
  error: SerializedError | null;
  selected: ReadonlySet<string>;
  progress: Readonly<Record<string, ChapterProgress>>;
  job: JobProgress | null;
  summary: JobSummary | null;
  log: readonly LogEntry[];
  fetchSeries(url: string): Promise<void>;
  setSelected(ids: Iterable<string>): void;
  toggle(id: string): void;
  start(): Promise<void>;
  cancel(): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  pickOutputFolder(): Promise<void>;
  clearLog(): void;
  dismissError(): void;
}

const MAX_LOG_ENTRIES = 2000;

const savedProgress = (series: SeriesInfo): Record<string, ChapterProgress> =>
  Object.fromEntries(
    Object.entries(series.saved).map(([id, saved]) => [
      id,
      { status: saved.status, done: saved.okPages, total: saved.totalPages },
    ]),
  );

export const useDownloader = (): Downloader => {
  const [series, setSeries] = useState<SeriesInfo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<SerializedError | null>(null);
  const [selected, setSelectedState] = useState<ReadonlySet<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, ChapterProgress>>({});
  const [job, setJob] = useState<JobProgress | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextLogId = useRef(0);
  const messages =
    MESSAGES[settings?.language ?? pickLocale(navigator.language)];

  const patchChapter = (id: string, patch: Partial<ChapterProgress>): void =>
    setProgress((current) => ({
      ...current,
      [id]: { status: "none", done: 0, total: 0, ...current[id], ...patch },
    }));

  const handleEvent = (event: DownloadEvent): void => {
    const line = describeEvent(event, messages);
    if (line) {
      nextLogId.current += 1;
      const entry: LogEntry = {
        ...line,
        id: nextLogId.current,
        time: new Date().toLocaleTimeString(messages.intlLocale, {
          hour12: false,
        }),
      };
      setLog((current) => [...current, entry].slice(-MAX_LOG_ENTRIES));
    }

    switch (event.type) {
      case "job-start":
        setJob({ finished: 0, total: event.chapterCount, bytes: 0 });
        break;
      case "chapter-start":
        patchChapter(event.chapterId, { status: "running", done: 0, total: 0 });
        break;
      case "chapter-pages":
        patchChapter(event.chapterId, { total: event.pageCount });
        break;
      case "page-done":
        patchChapter(event.chapterId, { done: event.done, total: event.total });
        if (!event.reused) {
          setJob((current) =>
            current
              ? { ...current, bytes: current.bytes + event.bytes }
              : current,
          );
        }
        break;
      case "chapter-done":
        patchChapter(event.chapterId, {
          status: event.status === "skipped" ? "done" : event.status,
          done: event.okPages,
          total: event.totalPages,
        });
        setJob((current) =>
          current ? { ...current, finished: current.finished + 1 } : current,
        );
        // finished chapters leave the selection so the next run targets only what is left
        if (event.status === "done" || event.status === "skipped") {
          setSelectedState((current) => {
            const next = new Set(current);
            next.delete(event.chapterId);
            return next;
          });
        }
        break;
      case "job-done":
        setSummary(event.summary);
        setRunning(false);
        // chapters never reached (cancelled job) go back to their idle state
        setProgress((current) =>
          Object.fromEntries(
            Object.entries(current).map(([id, value]) => [
              id,
              value.status === "queued" || value.status === "running"
                ? { ...value, status: value.done > 0 ? "incomplete" : "none" }
                : value,
            ]),
          ),
        );
        break;
      case "job-error":
        setError(event.error);
        setRunning(false);
        break;
      case "page-failed":
      case "retry":
        break;
    }
  };

  // the subscription must see the latest handler without resubscribing on every render
  const handlerRef = useRef(handleEvent);
  handlerRef.current = handleEvent;

  useEffect(() => {
    void window.api.getSettings().then((result) => {
      if (result.ok) setSettings(result.data);
      else setError(result.error);
    });
    return window.api.onDownloadEvent((event) => handlerRef.current(event));
  }, []);

  const fetchSeries = async (url: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setSummary(null);
    const result = await window.api.fetchSeries(url);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSeries(result.data);
    setProgress(savedProgress(result.data));
    setJob(null);
    // preselect everything that is not already complete on disk
    setSelectedState(
      new Set(
        result.data.chapters
          .filter((chapter) => result.data.saved[chapter.id]?.status !== "done")
          .map((chapter) => chapter.id),
      ),
    );
  };

  const start = async (): Promise<void> => {
    if (!series || selected.size === 0) return;
    setError(null);
    setSummary(null);
    setRunning(true);
    setProgress((current) => {
      const next = { ...current };
      for (const id of selected) {
        next[id] = { status: "queued", done: 0, total: 0 };
      }
      return next;
    });
    const result = await window.api.startDownload([...selected]);
    if (!result.ok) {
      setError(result.error);
      setRunning(false);
    }
  };

  const applySettings = (
    result: Awaited<ReturnType<typeof window.api.updateSettings>>,
  ): void => {
    if (result.ok) setSettings(result.data);
    else setError(result.error);
  };

  return {
    series,
    settings,
    messages,
    loading,
    running,
    error,
    selected,
    progress,
    job,
    summary,
    log,
    fetchSeries,
    start,
    setSelected: (ids) => setSelectedState(new Set(ids)),
    toggle: (id) =>
      setSelectedState((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    cancel: async () => {
      const result = await window.api.cancelDownload();
      if (!result.ok) setError(result.error);
    },
    updateSettings: async (patch) =>
      applySettings(await window.api.updateSettings(patch)),
    pickOutputFolder: async () =>
      applySettings(await window.api.pickOutputFolder()),
    clearLog: () => setLog([]),
    dismissError: () => setError(null),
  };
};
