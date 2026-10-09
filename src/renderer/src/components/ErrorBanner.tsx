import type { SerializedError } from "../../../shared/api";
import { errorDetail, errorHint, errorTitle } from "../text";

interface ErrorBannerProps {
  error: SerializedError;
  onDismiss: () => void;
}

export const ErrorBanner = ({ error, onDismiss }: ErrorBannerProps) => (
  <div className="error-banner" role="alert">
    <div>
      <strong>{errorTitle(error)}</strong>
      <p>{errorHint(error)}</p>
      <code>{errorDetail(error)}</code>
    </div>
    <button type="button" onClick={onDismiss} aria-label="ปิด">
      ปิด
    </button>
  </div>
);
