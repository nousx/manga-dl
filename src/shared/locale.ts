export const LOCALES = ["th", "en", "zh", "ko", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
  zh: "简体中文",
  ko: "한국어",
  ja: "日本語",
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** Maps a system locale such as "ja-JP" to a supported one; English otherwise. */
export const pickLocale = (systemLocale: string): Locale => {
  const base = systemLocale.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : "en";
};
