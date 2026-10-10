import type { ChapterRef } from "../../../shared/api";
import { useI18n } from "../i18n/context";
import type { ChapterProgress } from "../useDownloader";

interface ChapterRowProps {
  chapter: ChapterRef;
  checked: boolean;
  progress: ChapterProgress | undefined;
  disabled: boolean;
  onToggle: (id: string) => void;
}

export const ChapterRow = ({
  chapter,
  checked,
  progress,
  disabled,
  onToggle,
}: ChapterRowProps) => {
  const m = useI18n();
  const status = progress?.status ?? "none";
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pages = total > 0 ? ` ${done}/${total}` : "";

  return (
    <li className={`chapter-row status-${status}`}>
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(chapter.id)}
        />
        <span className="chapter-label">{chapter.label}</span>
        {chapter.date && <span className="muted">{chapter.date}</span>}
      </label>
      {status === "running" && total > 0 && (
        <div
          className="bar small"
          role="progressbar"
          aria-label={chapter.label}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div className="fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <span className="badge">
        {m.status[status]}
        {pages}
      </span>
    </li>
  );
};
