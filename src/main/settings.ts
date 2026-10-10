import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { AppError } from "../core/errors";
import { SETTING_LIMITS, type Settings } from "../shared/api";
import { isLocale } from "../shared/locale";

const isIntegerBetween = (
  value: unknown,
  { min, max }: { min: number; max: number },
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

/** Applies a patch from the renderer, rejecting anything out of range. */
export const applySettingsPatch = (
  current: Settings,
  patch: unknown,
): Settings => {
  if (typeof patch !== "object" || patch === null) {
    throw new AppError("INVALID_INPUT", "Settings patch must be an object");
  }
  const { outDir, imageConcurrency, requestDelayMs, language } =
    patch as Partial<Record<keyof Settings, unknown>>;
  const next = { ...current };
  if (outDir !== undefined) {
    if (typeof outDir !== "string" || !isAbsolute(outDir)) {
      throw new AppError("INVALID_INPUT", "outDir must be an absolute path");
    }
    next.outDir = outDir;
  }
  if (imageConcurrency !== undefined) {
    if (!isIntegerBetween(imageConcurrency, SETTING_LIMITS.imageConcurrency)) {
      throw new AppError("INVALID_INPUT", "imageConcurrency is out of range");
    }
    next.imageConcurrency = imageConcurrency;
  }
  if (requestDelayMs !== undefined) {
    if (!isIntegerBetween(requestDelayMs, SETTING_LIMITS.requestDelayMs)) {
      throw new AppError("INVALID_INPUT", "requestDelayMs is out of range");
    }
    next.requestDelayMs = requestDelayMs;
  }
  if (language !== undefined) {
    if (!isLocale(language)) {
      throw new AppError("INVALID_INPUT", "language is not supported");
    }
    next.language = language;
  }
  return next;
};

export const loadSettings = async (
  file: string,
  defaults: Settings,
): Promise<Settings> => {
  try {
    const saved: unknown = JSON.parse(await readFile(file, "utf8"));
    // a file without a language was written before other languages existed,
    // when the interface was Thai only: keep it Thai instead of switching
    const patch =
      typeof saved === "object" && saved !== null && !("language" in saved)
        ? { ...saved, language: "th" }
        : saved;
    return applySettingsPatch(defaults, patch);
  } catch {
    // first run or a hand-edited file that no longer validates
    return defaults;
  }
};

export const saveSettings = (file: string, settings: Settings): Promise<void> =>
  writeFile(file, JSON.stringify(settings, null, 2), "utf8");
