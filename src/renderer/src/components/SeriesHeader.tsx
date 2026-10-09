import { useState } from "react";
import type { SeriesInfo } from "../../../shared/api";
import { formatBytes } from "../text";
import type { ChapterProgress, JobProgress } from "../useDownloader";

interface SeriesHeaderProps {
  series: SeriesInfo;
  selectedCount: number;
  running: boolean;
  job: JobProgress | null;
  progress: Readonly<Record<string, ChapterProgress>>;
  onSelect: (ids: string[]) => void;
  onStart: () => void;
  onCancel: () => void;
  onOpenFolder: () => void;
}

const MAX_LISTED_GAPS = 12;

/** Parses "5" or "1-20" into an inclusive range; null when the text is not a range. */
const parseRange = (text: string): [number, number] | null => {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*$/.exec(text);
  if (!match?.[1]) return null;
  const from = Number(match[1]);
  const to = match[2] === undefined ? from : Number(match[2]);
  return from <= to ? [from, to] : [to, from];
};

export const SeriesHeader = ({
  series,
  selectedCount,
  running,
  job,
  progress,
  onSelect,
  onStart,
  onCancel,
  onOpenFolder,
}: SeriesHeaderProps) => {
  const [rangeText, setRangeText] = useState("");
  const range = parseRange(rangeText);
  const { chapters, missingNumbers } = series;

  const doneCount = chapters.filter(
    (chapter) => progress[chapter.id]?.status === "done",
  ).length;
  const notDone = chapters.filter(
    (chapter) => progress[chapter.id]?.status !== "done",
  );
  const listedGaps = missingNumbers.slice(0, MAX_LISTED_GAPS).join(", ");
  const moreGaps = missingNumbers.length - MAX_LISTED_GAPS;
  const percent = job && job.total > 0 ? (job.finished / job.total) * 100 : 0;

  const selectRange = (): void => {
    if (!range) return;
    const [from, to] = range;
    onSelect(
      chapters
        .filter(
          ({ number }) => number !== null && number >= from && number <= to,
        )
        .map((chapter) => chapter.id),
    );
  };

  return (
    <div className="series-header">
      <div className="series-title">
        <h1>{series.title}</h1>
        <span className="muted">
          {series.siteName} · {chapters.length} ตอน · มีในเครื่องครบ {doneCount}{" "}
          ตอน
        </span>
      </div>

      {missingNumbers.length > 0 && (
        <p className="notice">
          เว็บต้นทางไม่มี {missingNumbers.length} ตอน: {listedGaps}
          {moreGaps > 0 && ` และอีก ${moreGaps} ตอน`}
        </p>
      )}

      <div className="toolbar">
        <button
          type="button"
          disabled={running}
          onClick={() => onSelect(chapters.map((chapter) => chapter.id))}
        >
          เลือกทั้งหมด
        </button>
        <button
          type="button"
          disabled={running}
          onClick={() => onSelect(notDone.map((chapter) => chapter.id))}
        >
          เลือกที่ยังไม่ครบ
        </button>
        <button type="button" disabled={running} onClick={() => onSelect([])}>
          ล้าง
        </button>
        <input
          type="text"
          className="range"
          aria-label="ช่วงตอน เช่น 1-20"
          placeholder="ช่วงตอน เช่น 1-20"
          value={rangeText}
          disabled={running}
          onChange={(event) => setRangeText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") selectRange();
          }}
        />
        <button
          type="button"
          disabled={running || !range}
          onClick={selectRange}
        >
          เลือกช่วง
        </button>
        <span className="spacer" />
        <button type="button" onClick={onOpenFolder}>
          เปิดโฟลเดอร์เรื่อง
        </button>
        {running ? (
          <button type="button" className="danger" onClick={onCancel}>
            ยกเลิก
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={selectedCount === 0}
            onClick={onStart}
          >
            โหลด {selectedCount} ตอน
          </button>
        )}
      </div>

      {job && (
        <div className="job-progress">
          <div
            className="bar"
            role="progressbar"
            aria-label="ความคืบหน้าทั้งหมด"
            aria-valuenow={job.finished}
            aria-valuemin={0}
            aria-valuemax={job.total}
          >
            <div className="fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="muted">
            {job.finished}/{job.total} ตอน · {formatBytes(job.bytes)}
          </span>
        </div>
      )}
    </div>
  );
};
