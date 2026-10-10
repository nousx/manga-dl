import type { Locale } from "../../../shared/locale";
import { en } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { th } from "./th";
import type { Messages } from "./types";
import { zh } from "./zh";

export type { Messages } from "./types";

export const MESSAGES: Record<Locale, Messages> = { th, en, zh, ko, ja };
