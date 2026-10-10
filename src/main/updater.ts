import { app } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateState } from "../shared/api";

// electron-updater is CommonJS: the named export only exists on the default one
const { autoUpdater } = electronUpdater;

/** Fixed page for builds that cannot update themselves. Never built from input. */
export const RELEASES_URL = "https://github.com/nousx/manga-dl/releases/latest";

const FIRST_CHECK_DELAY_MS = 3_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 300;

export interface Updater {
  getState(): UpdateState;
  check(): Promise<UpdateState>;
  /** Quits and runs the downloaded installer; false when nothing is ready. */
  install(): boolean;
}

const unsupportedReason = (): UpdateState["unsupportedReason"] => {
  if (!app.isPackaged) return "development";
  // the portable exe unpacks to a temp folder on every launch, so it cannot replace itself
  if (process.env.PORTABLE_EXECUTABLE_DIR) return "portable";
  return null;
};

const shortMessage = (error: unknown): string => {
  const text = error instanceof Error ? error.message : String(error);
  return (text.split("\n")[0] ?? "").slice(0, MAX_MESSAGE_LENGTH);
};

/**
 * Updates come from the GitHub releases of this repository (see "publish" in
 * package.json). electron-updater checks the sha512 from latest.yml before it
 * runs an installer.
 */
export const createUpdater = (
  notify: (state: UpdateState) => void,
): Updater => {
  const reason = unsupportedReason();
  let state: UpdateState = {
    status: reason ? "unsupported" : "idle",
    unsupportedReason: reason,
    currentVersion: app.getVersion(),
    version: null,
    percent: 0,
    message: null,
  };
  const set = (patch: Partial<UpdateState>): void => {
    state = { ...state, ...patch };
    notify(state);
  };
  if (reason) {
    return {
      getState: () => state,
      check: async () => state,
      install: () => false,
    };
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () =>
    set({ status: "checking", message: null }),
  );
  autoUpdater.on("update-available", (info) =>
    set({ status: "downloading", version: info.version, percent: 0 }),
  );
  autoUpdater.on("update-not-available", () =>
    set({ status: "up-to-date", version: null }),
  );
  autoUpdater.on("download-progress", (progress) =>
    set({ status: "downloading", percent: Math.round(progress.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    set({ status: "ready", version: info.version, percent: 100 }),
  );
  autoUpdater.on("error", (error) =>
    set({ status: "error", message: shortMessage(error) }),
  );

  const busy = (): boolean =>
    state.status === "checking" ||
    state.status === "downloading" ||
    state.status === "ready";

  const check = async (): Promise<UpdateState> => {
    if (busy()) return state;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      set({ status: "error", message: shortMessage(error) });
    }
    return state;
  };

  setTimeout(() => void check(), FIRST_CHECK_DELAY_MS);
  setInterval(() => void check(), CHECK_INTERVAL_MS).unref();

  return {
    getState: () => state,
    check,
    install: () => {
      if (state.status !== "ready") return false;
      autoUpdater.quitAndInstall();
      return true;
    },
  };
};
