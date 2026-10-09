import type { MangaApi } from "../../shared/api";

declare global {
  interface Window {
    api: MangaApi;
  }
}
