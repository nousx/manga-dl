import type { SiteAdapter } from "../core/types";
import { arenascan } from "./arenascan";

/** Register a new site by adding its adapter to this list. */
export const siteAdapters: SiteAdapter[] = [arenascan];
