import type { JobSummary } from "../../../shared/api";
import { useI18n } from "../i18n/context";
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
  const m = useI18n();
  const { failures } = summary;
  const clean = failures.length === 0 && !summary.cancelled;

  return (
    <div className={`summary ${clean ? "ok" : "problem"}`}>
      <strong>{m.summary.line(summary.cancelled, summary)}</strong>
      {failures.length > 0 && (
        <>
          <ul>
            {failures.map((failure) => (
              <li key={failure.chapterId}>
                <b>{failure.label}</b>:{" "}
                {failure.error
                  ? `${errorTitle(failure.error, m)}: ${errorHint(failure.error, m)}`
                  : m.summary.failedPages(
                      failure.failedPages.length,
                      failure.failedPages.join(", "),
                    )}
              </li>
            ))}
          </ul>
          <button type="button" disabled={disabled} onClick={onSelectFailures}>
            {m.summary.selectFailures}
          </button>
        </>
      )}
    </div>
  );
};
