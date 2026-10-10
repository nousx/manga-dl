import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors";
import { applySettingsPatch, loadSettings } from "../src/main/settings";
import { MESSAGES } from "../src/renderer/src/i18n";
import { describeEvent } from "../src/renderer/src/text";
import type { Settings } from "../src/shared/api";
import {
  isLocale,
  LOCALE_NAMES,
  LOCALES,
  pickLocale,
  type Locale,
} from "../src/shared/locale";

const settings: Settings = {
  outDir: "C:\\out",
  imageConcurrency: 4,
  requestDelayMs: 200,
  language: "en",
};

// Stands in for any argument: prints as a number, compares as a number, and
// carries the count fields, so one value fits every message signature.
const SAMPLE: unknown = Object.assign(new Number(7), {
  done: 1,
  skipped: 2,
  incomplete: 3,
  failed: 4,
});

/** Calls every message, including the ones that take arguments. */
const renderAll = (value: unknown, path: string): [string, string][] => {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") {
    const sample = (value as (...args: unknown[]) => unknown)(
      SAMPLE,
      SAMPLE,
      SAMPLE,
    );
    return [[path, String(sample)]];
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      renderAll(child, `${path}.${key}`),
    );
  }
  return [[path, ""]];
};

const paths = (locale: Locale): string[] =>
  renderAll(MESSAGES[locale], locale)
    .map(([path]) => path.slice(locale.length))
    .sort();

describe("pickLocale", () => {
  it.each([
    ["th-TH", "th"],
    ["en-GB", "en"],
    ["zh-CN", "zh"],
    ["zh_TW", "zh"],
    ["ko", "ko"],
    ["JA-jp", "ja"],
  ])("should map %s to %s", (system, expected) => {
    expect(pickLocale(system)).toBe(expected);
  });

  it.each(["fr-FR", "", "x"])(
    "should fall back to English when the system language is %s",
    (system) => {
      expect(pickLocale(system)).toBe("en");
    },
  );
});

describe("isLocale", () => {
  it.each(["fr", "TH", "", 5, null, undefined, ["th"]])(
    "should reject %s",
    (value) => {
      expect(isLocale(value)).toBe(false);
    },
  );

  it("should name every supported language", () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual([...LOCALES].sort());
  });
});

describe("applySettingsPatch", () => {
  it("should change the language when it is supported", () => {
    const next = applySettingsPatch(settings, { language: "ja" });

    expect(next.language).toBe("ja");
  });

  it("should keep the language when the patch leaves it out", () => {
    const next = applySettingsPatch(settings, { requestDelayMs: 300 });

    expect(next.language).toBe("en");
  });

  it.each(["fr", "", 5, null, "../th"])(
    "should throw INVALID_INPUT when the language is %s",
    (language) => {
      const attempt = (): Settings =>
        applySettingsPatch(settings, { language });

      expect(attempt).toThrowError(AppError);
      expect(attempt).toThrowError(/language/);
    },
  );
});

describe("loadSettings", () => {
  let directory: string;
  const file = (): string => join(directory, "settings.json");

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "manga-dl-settings-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("should use the default language when there is no settings file", async () => {
    const loaded = await loadSettings(file(), settings);

    expect(loaded.language).toBe("en");
  });

  it("should stay Thai when the file was saved before languages existed", async () => {
    await writeFile(file(), JSON.stringify({ requestDelayMs: 300 }));

    const loaded = await loadSettings(file(), settings);

    expect(loaded).toMatchObject({ language: "th", requestDelayMs: 300 });
  });

  it("should keep the saved language when the file has one", async () => {
    await writeFile(file(), JSON.stringify({ language: "ko" }));

    const loaded = await loadSettings(file(), settings);

    expect(loaded.language).toBe("ko");
  });

  it("should fall back to the defaults when the saved language is not supported", async () => {
    await writeFile(file(), JSON.stringify({ language: "fr" }));

    const loaded = await loadSettings(file(), settings);

    expect(loaded).toEqual(settings);
  });
});

describe("messages", () => {
  it.each(LOCALES)(
    "should define the same messages in %s as in Thai",
    (locale) => {
      expect(paths(locale)).toEqual(paths("th"));
    },
  );

  it.each(LOCALES)("should leave no required message empty in %s", (locale) => {
    // sites.addAfter is the tail of a sentence and is empty in some languages
    const empty = renderAll(MESSAGES[locale], locale)
      .filter(
        ([path, text]) => text.trim() === "" && !path.endsWith(".addAfter"),
      )
      .map(([path]) => path);

    expect(empty).toEqual([]);
  });

  it.each(LOCALES)("should render no placeholder leftovers in %s", (locale) => {
    const broken = renderAll(MESSAGES[locale], locale)
      .filter(([, text]) => /undefined|NaN|\[object|\$\{/.test(text))
      .map(([path]) => path);

    expect(broken).toEqual([]);
  });

  it.each(LOCALES)("should avoid em dashes in %s", (locale) => {
    const dashed = renderAll(MESSAGES[locale], locale)
      .filter(([, text]) => text.includes("—"))
      .map(([path]) => path);

    expect(dashed).toEqual([]);
  });
});

describe("describeEvent", () => {
  it("should describe the same event in the chosen language", () => {
    const event = {
      type: "job-start",
      seriesTitle: "Title",
      seriesDir: "C:\\out\\Title",
      chapterCount: 3,
    } as const;

    const lines = LOCALES.map(
      (locale) => describeEvent(event, MESSAGES[locale])?.text,
    );

    expect(lines[1]).toBe('Started "Title": 3 chapters');
    expect(new Set(lines).size).toBe(LOCALES.length);
  });

  it("should use the singular form in English when the count is one", () => {
    const line = describeEvent(
      {
        type: "job-start",
        seriesTitle: "Title",
        seriesDir: "C:\\out\\Title",
        chapterCount: 1,
      },
      MESSAGES.en,
    );

    expect(line?.text).toBe('Started "Title": 1 chapter');
  });
});
