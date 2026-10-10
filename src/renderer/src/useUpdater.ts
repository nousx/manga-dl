import { useEffect, useState } from "react";
import type { SerializedError, UpdateState } from "../../shared/api";

export interface UpdaterView {
  state: UpdateState | null;
  error: SerializedError | null;
  check(): Promise<void>;
  install(): Promise<void>;
  openReleasePage(): Promise<void>;
  dismissError(): void;
}

export const useUpdater = (): UpdaterView => {
  const [state, setState] = useState<UpdateState | null>(null);
  const [error, setError] = useState<SerializedError | null>(null);

  useEffect(() => {
    void window.api.getUpdateState().then((result) => {
      if (result.ok) setState(result.data);
      else setError(result.error);
    });
    return window.api.onUpdateState(setState);
  }, []);

  return {
    state,
    error,
    check: async () => {
      const result = await window.api.checkForUpdate();
      if (result.ok) setState(result.data);
      else setError(result.error);
    },
    install: async () => {
      const result = await window.api.installUpdate();
      if (!result.ok) setError(result.error);
    },
    openReleasePage: async () => {
      const result = await window.api.openReleasePage();
      if (!result.ok) setError(result.error);
    },
    dismissError: () => setError(null),
  };
};
