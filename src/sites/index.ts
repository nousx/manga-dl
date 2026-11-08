import type { SiteAdapter } from "../core/types";
import { arenascan } from "./arenascan";
import { kingofshojo } from "./kingofshojo";
import { divascans } from "./divascans";
import { comix } from "./comix";
import { qimanga } from "./qimanga";

/** Register a new site by adding its adapter to this list. */
export const siteAdapters: SiteAdapter[] = [
  arenascan,
  kingofshojo,
  divascans,
  comix,
  qimanga,
];
