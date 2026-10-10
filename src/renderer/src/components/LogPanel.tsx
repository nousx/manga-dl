import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/context";
import type { LogEntry } from "../text";

interface LogPanelProps {
  log: readonly LogEntry[];
  onClear: () => void;
  onOpenLogs: () => void;
}

export const LogPanel = ({ log, onClear, onOpenLogs }: LogPanelProps) => {
  const m = useI18n();
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [page, setPage] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const shown = problemsOnly
    ? log.filter((entry) => entry.level === "error" || entry.level === "warn")
    : log;
  const problemCount = log.filter((entry) => entry.level === "error").length;
  // Bound DOM work even when a job produces the full 2,000-line log.
  const pageCount = Math.max(1, Math.ceil(shown.length / 100));
  const pageIndex =
    page === null ? pageCount - 1 : Math.min(page, pageCount - 1);
  const visible = shown.slice(pageIndex * 100, (pageIndex + 1) * 100);
  const lastId = visible.at(-1)?.id;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = page === null ? list.scrollHeight : 0;
  }, [pageIndex, lastId, page]);

  return (
    <section className="panel log">
      <div className="log-header">
        <h2>
          {m.log.title}
          {problemCount > 0 && (
            <span className="count">{m.log.errorCount(problemCount)}</span>
          )}
        </h2>
        <label>
          <input
            type="checkbox"
            checked={problemsOnly}
            onChange={(event) => {
              setProblemsOnly(event.target.checked);
              setPage(null);
            }}
          />
          {m.log.problemsOnly}
        </label>
        <button type="button" onClick={onOpenLogs}>
          {m.log.logFiles}
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(null);
            onClear();
          }}
        >
          {m.common.clear}
        </button>
      </div>
      {pageCount > 1 && (
        <div className="log-pagination">
          <button
            disabled={pageIndex === 0}
            onClick={() => setPage(pageIndex - 1)}
          >
            {m.log.previous}
          </button>
          <span>
            {m.log.range(
              pageIndex * 100 + 1,
              Math.min((pageIndex + 1) * 100, shown.length),
              shown.length,
            )}
          </span>
          <button
            disabled={pageIndex === pageCount - 1}
            onClick={() => setPage(pageIndex + 1)}
          >
            {m.log.next}
          </button>
          <button disabled={page === null} onClick={() => setPage(null)}>
            {m.log.follow}
          </button>
        </div>
      )}
      <ul className="log-list" ref={listRef}>
        {shown.length === 0 && <li className="muted">{m.log.empty}</li>}
        {visible.map((entry) => (
          <li key={entry.id} className={`log-${entry.level}`}>
            <span className="time">{entry.time}</span>
            <span className="text">
              {entry.text}
              {entry.detail && <code>{entry.detail}</code>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
