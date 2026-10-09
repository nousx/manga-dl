import type { JobSummary } from "../../../shared/api";
import { errorHint, errorTitle } from "../text";

interface SummaryCardProps {
  summary: JobSummary;
  disabled: boolean;
  onSelectFailures: () => void;
}

export const SummaryCard = ({
  summary,
  disabled,
  onSelectFailures,
}: SummaryCardProps) => {
  const { failures } = summary;
  const clean = failures.length === 0 && !summary.cancelled;

  return (
    <div className={`summary ${clean ? "ok" : "problem"}`}>
      <strong>
        {summary.cancelled ? "ยกเลิกกลางคัน" : "จบงาน"}: เสร็จ {summary.done} ·
        ข้าม (มีครบแล้ว) {summary.skipped} · ไม่ครบ {summary.incomplete} ·
        ล้มเหลว {summary.failed}
      </strong>
      {failures.length > 0 && (
        <>
          <ul>
            {failures.map((failure) => (
              <li key={failure.chapterId}>
                <b>{failure.label}</b>:{" "}
                {failure.error
                  ? `${errorTitle(failure.error)}: ${errorHint(failure.error)}`
                  : `โหลดไม่ได้ ${failure.failedPages.length} รูป (รูปที่ ${failure.failedPages.join(", ")})`}
              </li>
            ))}
          </ul>
          <button type="button" disabled={disabled} onClick={onSelectFailures}>
            เลือกเฉพาะตอนที่มีปัญหา
          </button>
        </>
      )}
    </div>
  );
};
