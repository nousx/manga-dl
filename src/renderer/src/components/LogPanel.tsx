import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../text";

interface LogPanelProps {
  log: readonly LogEntry[];
  onClear: () => void;
  onOpenLogs: () => void;
}

export const LogPanel = ({ log, onClear, onOpenLogs }: LogPanelProps) => {
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
          บันทึกการทำงาน
          {problemCount > 0 && (
            <span className="count">{problemCount} ข้อผิดพลาด</span>
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
          เฉพาะปัญหา
        </label>
        <button type="button" onClick={onOpenLogs}>
          ไฟล์ log
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(null);
            onClear();
          }}
        >
          ล้าง
        </button>
      </div>
      {pageCount > 1 && (
        <div className="log-pagination">
          <button
            disabled={pageIndex === 0}
            onClick={() => setPage(pageIndex - 1)}
          >
            ก่อนหน้า
          </button>
          <span>
            {pageIndex * 100 + 1}–
            {Math.min((pageIndex + 1) * 100, shown.length)} จาก {shown.length}
          </span>
          <button
            disabled={pageIndex === pageCount - 1}
            onClick={() => setPage(pageIndex + 1)}
          >
            ถัดไป
          </button>
          <button disabled={page === null} onClick={() => setPage(null)}>
            ติดตามล่าสุด
          </button>
        </div>
      )}
      <ul className="log-list" ref={listRef}>
        {shown.length === 0 && <li className="muted">ยังไม่มีรายการ</li>}
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
