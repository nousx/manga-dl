import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { AppError } from "../core/errors";
import { SETTING_LIMITS, type Settings } from "../shared/api";

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
  const { outDir, imageConcurrency, requestDelayMs } = patch as Partial<
    Record<keyof Settings, unknown>
  >;
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
  return next;
};

export const loadSettings = async (
  file: string,
  defaults: Settings,
): Promise<Settings> => {
  try {
    return applySettingsPatch(
      defaults,
      JSON.parse(await readFile(file, "utf8")),
    );
  } catch {
    // first run or a hand-edited file that no longer validates
    return defaults;
  }
};

export const saveSettings = (file: string, settings: Settings): Promise<void> =>
  writeFile(file, JSON.stringify(settings, null, 2), "utf8");
