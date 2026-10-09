import { createMangaReaderAdapter } from "./themes/mangareader";

export const arenascan = createMangaReaderAdapter({
  id: "arenascan",
  name: "Arena Scan",
  hosts: ["arenascan.com"],
  exampleUrl: "https://arenascan.com/manga/reset-life-of-regression-police/",
  seriesPathPrefix: "/manga/",
});
