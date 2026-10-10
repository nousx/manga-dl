import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { DownloadEvent } from "../core/events";
import { CHANNELS, type MangaApi, type UpdateState } from "../shared/api";

const api: MangaApi = {
  listHistory: () => ipcRenderer.invoke(CHANNELS.listHistory),
  openHistoryFolder: (id) => ipcRenderer.invoke(CHANNELS.openHistoryFolder, id),
  listSites: () => ipcRenderer.invoke(CHANNELS.listSites),
  fetchSeries: (url) => ipcRenderer.invoke(CHANNELS.fetchSeries, url),
  startDownload: (chapterIds) =>
    ipcRenderer.invoke(CHANNELS.startDownload, chapterIds),
  cancelDownload: () => ipcRenderer.invoke(CHANNELS.cancelDownload),
  getSettings: () => ipcRenderer.invoke(CHANNELS.getSettings),
  updateSettings: (patch) => ipcRenderer.invoke(CHANNELS.updateSettings, patch),
  pickOutputFolder: () => ipcRenderer.invoke(CHANNELS.pickOutputFolder),
  openFolder: (target) => ipcRenderer.invoke(CHANNELS.openFolder, target),
  onDownloadEvent: (listener) => {
    const forward = (_event: IpcRendererEvent, payload: DownloadEvent): void =>
      listener(payload);
    ipcRenderer.on(CHANNELS.downloadEvent, forward);
    return () => {
      ipcRenderer.removeListener(CHANNELS.downloadEvent, forward);
    };
  },
  getUpdateState: () => ipcRenderer.invoke(CHANNELS.getUpdateState),
  checkForUpdate: () => ipcRenderer.invoke(CHANNELS.checkForUpdate),
  installUpdate: () => ipcRenderer.invoke(CHANNELS.installUpdate),
  openReleasePage: () => ipcRenderer.invoke(CHANNELS.openReleasePage),
  onUpdateState: (listener) => {
    const forward = (_event: IpcRendererEvent, payload: UpdateState): void =>
      listener(payload);
    ipcRenderer.on(CHANNELS.updateState, forward);
    return () => {
      ipcRenderer.removeListener(CHANNELS.updateState, forward);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);
