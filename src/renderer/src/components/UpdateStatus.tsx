import type { UpdateState } from "../../../shared/api";
import { useI18n } from "../i18n/context";

interface UpdateStatusProps {
  state: UpdateState;
  onCheck: () => void;
  onInstall: () => void;
  onOpenReleases: () => void;
}

export const UpdateStatus = ({
  state,
  onCheck,
  onInstall,
  onOpenReleases,
}: UpdateStatusProps) => {
  const m = useI18n();

  if (state.status === "unsupported") {
    if (state.unsupportedReason === "development")
      return <p className="update-status">{m.update.development}</p>;
    return (
      <div className="update-status">
        <p>{m.update.portable}</p>
        <button type="button" onClick={onOpenReleases}>
          {m.update.openReleases}
        </button>
      </div>
    );
  }

  if (state.status === "ready") {
    return (
      <div className="update-status" role="status">
        <p className="update-ready">{m.update.ready(state.version ?? "")}</p>
        <button type="button" className="primary" onClick={onInstall}>
          {m.update.restart}
        </button>
      </div>
    );
  }

  if (state.status === "checking" || state.status === "downloading") {
    return (
      <p className="update-status" role="status">
        {state.status === "checking"
          ? m.update.checking
          : m.update.downloading(state.version ?? "", state.percent)}
      </p>
    );
  }

  return (
    <div className="update-status" role="status">
      {state.status === "up-to-date" && <p>{m.update.upToDate}</p>}
      {state.status === "error" && (
        <p className="update-failed" title={state.message ?? undefined}>
          {m.update.failed}
        </p>
      )}
      <button type="button" onClick={onCheck}>
        {m.update.check}
      </button>
    </div>
  );
};
