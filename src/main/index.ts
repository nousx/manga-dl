import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
} from "electron";
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { downloadChapters } from "../core/downloader";
import { AppError, serializeError } from "../core/errors";
import type { DownloadEvent } from "../core/events";
import { HttpClient } from "../core/http";
import { scanHistory, resolveHistoryFolder } from "../core/history";
import { loadManifest } from "../core/manifest";
import { seriesDirectory } from "../core/paths";
import { resolveSite } from "../core/registry";
import type { Series, SiteAdapter } from "../core/types";
import {
  CHANNELS,
  type FolderTarget,
  type Result,
  type SavedChapter,
  type SeriesInfo,
  type Settings,
} from "../shared/api";
import { pickLocale } from "../shared/locale";
import { siteAdapters } from "../sites";
import { applySettingsPatch, loadSettings, saveSettings } from "./settings";
import { createUpdater, RELEASES_URL, type Updater } from "./updater";

interface LoadedSeries {
  adapter: SiteAdapter;
  series: Series;
}

let mainWindow: BrowserWindow | null = null;
let settings: Settings;
let loaded: LoadedSeries | null = null;
let activeJob: AbortController | null = null;
let updater: Updater;

const settingsFile = (): string =>
  join(app.getPath("userData"), "settings.json");
const logsDirectory = (): string => join(settings.outDir, "logs");

const handle = <T>(
  channel: string,
  handler: (...args: unknown[]) => Promise<T> | T,
): void => {
  ipcMain.handle(channel, async (_event, ...args): Promise<Result<T>> => {
    try {
      return { ok: true, data: await handler(...args) };
    } catch (error) {
      return { ok: false, error: serializeError(error) };
    }
  });
};

const describeSaved = async (series: Series): Promise<SeriesInfo> => {
  const seriesDir = seriesDirectory(settings.outDir, series);
  const manifest = await loadManifest(seriesDir, series);
  const saved: Record<string, SavedChapter> = {};
  for (const record of Object.values(manifest.chapters)) {
    saved[record.id] = {
      status: record.status,
      okPages: record.pages.filter((page) => page.status === "ok").length,
      totalPages: record.pages.length,
    };
  }
  return { ...series, seriesDir, saved };
};

const openLog = async (): Promise<WriteStream> => {
  await mkdir(logsDirectory(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return createWriteStream(join(logsDirectory(), `${stamp}.jsonl`), {
    flags: "a",
  });
};

const runJob = async (
  { adapter, series }: LoadedSeries,
  chapterIds: string[],
  controller: AbortController,
): Promise<void> => {
  const log = await openLog();
  const emit = (event: DownloadEvent): void => {
    log.write(
      `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`,
    );
    mainWindow?.webContents.send(CHANNELS.downloadEvent, event);
  };
  try {
    const wanted = new Set(chapterIds);
    await downloadChapters({
      adapter,
      series,
      chapters: series.chapters.filter((chapter) => wanted.has(chapter.id)),
      outDir: settings.outDir,
      imageConcurrency: settings.imageConcurrency,
      http: new HttpClient({
        minDelayMs: settings.requestDelayMs,
        signal: controller.signal,
        onRetry: (info) => emit({ type: "retry", ...info }),
      }),
      emit,
      signal: controller.signal,
    });
  } catch (error) {
    emit({ type: "job-error", error: serializeError(error) });
  } finally {
    activeJob = null;
    log.end();
  }
};

const registerHandlers = (): void => {
  handle(CHANNELS.listSites, () =>
    siteAdapters.map(({ id, name, domains, exampleUrl, engine }) => ({
      id,
      name,
      domains,
      exampleUrl,
      engine,
    })),
  );
  handle(CHANNELS.listHistory, (...args) => {
    if (args.length !== 0)
      throw new AppError("INVALID_INPUT", "History scan takes no arguments");
    return scanHistory(settings.outDir);
  });
  handle(CHANNELS.openHistoryFolder, async (...args) => {
    if (args.length !== 1)
      throw new AppError("INVALID_INPUT", "Expected one history id");
    const folder = await resolveHistoryFolder(settings.outDir, args[0]);
    const failure = await shell.openPath(folder);
    if (failure) throw new AppError("FILE_SYSTEM", failure);
    return null;
  });

  handle(CHANNELS.fetchSeries, async (input) => {
    if (typeof input !== "string" || input.length > 2000) {
      throw new AppError("INVALID_INPUT", "URL must be a string");
    }
    if (activeJob) {
      throw new AppError("BUSY", "A download is still running");
    }
    const { adapter, url } = resolveSite(siteAdapters, input);
    const series = await adapter.getSeries(
      url,
      new HttpClient({ minDelayMs: settings.requestDelayMs }),
    );
    loaded = { adapter, series };
    return describeSaved(series);
  });

  handle(CHANNELS.startDownload, (chapterIds) => {
    if (
      !Array.isArray(chapterIds) ||
      chapterIds.length === 0 ||
      !chapterIds.every((id): id is string => typeof id === "string")
    ) {
      throw new AppError(
        "INVALID_INPUT",
        "chapterIds must be a non-empty list",
      );
    }
    if (!loaded) {
      throw new AppError("INVALID_INPUT", "Load a series before downloading");
    }
    if (activeJob) {
      throw new AppError("BUSY", "A download is already running");
    }
    // only chapters from the series loaded by this process can be requested
    const known = new Set(loaded.series.chapters.map((chapter) => chapter.id));
    if (!chapterIds.every((id) => known.has(id))) {
      throw new AppError("INVALID_INPUT", "Unknown chapter id in request");
    }
    activeJob = new AbortController();
    void runJob(loaded, chapterIds, activeJob);
    return null;
  });

  handle(CHANNELS.cancelDownload, () => {
    activeJob?.abort();
    return null;
  });

  handle(CHANNELS.getSettings, () => settings);

  handle(CHANNELS.updateSettings, async (patch) => {
    if (activeJob) {
      throw new AppError("BUSY", "Settings cannot change during a download");
    }
    settings = applySettingsPatch(settings, patch);
    await saveSettings(settingsFile(), settings);
    return settings;
  });

  handle(CHANNELS.pickOutputFolder, async () => {
    if (activeJob) {
      throw new AppError("BUSY", "Settings cannot change during a download");
    }
    const options: Electron.OpenDialogOptions = {
      defaultPath: settings.outDir,
      properties: ["openDirectory", "createDirectory"],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    const [picked] = result.filePaths;
    if (result.canceled || picked === undefined) return settings;
    settings = applySettingsPatch(settings, { outDir: picked });
    await saveSettings(settingsFile(), settings);
    return settings;
  });

  handle(CHANNELS.openFolder, async (target) => {
    const folders: Record<FolderTarget, string | null> = {
      output: settings.outDir,
      logs: logsDirectory(),
      series: loaded ? seriesDirectory(settings.outDir, loaded.series) : null,
    };
    const folder =
      typeof target === "string" && Object.hasOwn(folders, target)
        ? folders[target as FolderTarget]
        : null;
    if (folder === null) {
      throw new AppError("INVALID_INPUT", "Unknown folder target");
    }
    await mkdir(folder, { recursive: true });
    const failure = await shell.openPath(folder);
    if (failure !== "")
      throw new AppError("FILE_SYSTEM", failure, { path: folder });
    return null;
  });

  handle(CHANNELS.getUpdateState, () => updater.getState());

  handle(CHANNELS.checkForUpdate, () => updater.check());

  handle(CHANNELS.installUpdate, () => {
    if (activeJob) {
      throw new AppError("BUSY", "Finish or cancel the download first");
    }
    if (!updater.install()) {
      throw new AppError("INVALID_INPUT", "No update is ready to install");
    }
    return null;
  });

  handle(CHANNELS.openReleasePage, async () => {
    await shell.openExternal(RELEASES_URL);
    return null;
  });
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#15181c" : "#f9fafb",
    autoHideMenuBar: true,
    title: "manga-dl",
    icon: join(app.getAppPath(), "resources/icon.ico"),
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // the UI is a single local page: never open or navigate to anything else
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) void mainWindow.loadURL(devServerUrl);
  else
    void mainWindow.loadFile(
      join(import.meta.dirname, "../renderer/index.html"),
    );
};

void app.whenReady().then(async () => {
  app.setAppUserModelId("manga-dl.desktop");
  settings = await loadSettings(settingsFile(), {
    outDir: join(app.getPath("downloads"), "manga-dl"),
    imageConcurrency: 4,
    requestDelayMs: 200,
    language: pickLocale(app.getLocale()),
  });
  updater = createUpdater((state) =>
    mainWindow?.webContents.send(CHANNELS.updateState, state),
  );
  registerHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  activeJob?.abort();
  app.quit();
});
