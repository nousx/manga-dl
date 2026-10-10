import type { SerializedError } from "../../../shared/api";
import { useI18n } from "../i18n/context";
import { errorDetail, errorHint, errorTitle } from "../text";

interface ErrorBannerProps {
  error: SerializedError;
  onDismiss: () => void;
}

export const ErrorBanner = ({ error, onDismiss }: ErrorBannerProps) => {
  const m = useI18n();

  return (
    <div className="error-banner" role="alert">
      <div>
        <strong>{errorTitle(error, m)}</strong>
        <p>{errorHint(error, m)}</p>
        <code>{errorDetail(error)}</code>
      </div>
      <button type="button" onClick={onDismiss}>
        {m.common.close}
      </button>
    </div>
  );
};
