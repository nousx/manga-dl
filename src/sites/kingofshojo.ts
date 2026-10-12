import { createMangaReaderAdapter } from "./themes/mangareader";

export const kingofshojo = createMangaReaderAdapter({
  id: "kingofshojo",
  name: "King of Shojo",
  hosts: ["kingofshojo.com"],
  exampleUrl:
    "https://kingofshojo.com/manga/the-saint-who-levels-up-as-a-necromancer/",
  seriesPathPrefix: "/manga/",
});
