import { load } from "cheerio";
import { AppError } from "../core/errors";
import { parsePublicUrl, unsafeUrl } from "../core/net";
import { findMissingNumbers, sortChapters } from "../core/series";
import type { ChapterPages, ChapterRef, SiteAdapter } from "../core/types";

const TITLE_PATH = /^\/title\/([a-z0-9]+)-[^/]+\/?$/i;
const CHAPTER_PATH = /^\/title\/([a-z0-9]+)-[^/]+\/(\d+)-[^/]+\/?$/i;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const comixPageUrl = (raw: string): URL => {
  const url = parsePublicUrl(raw);
  if (
    !url ||
    url.hostname !== "comix.to" ||
    url.port ||
    (!TITLE_PATH.test(url.pathname) && !CHAPTER_PATH.test(url.pathname))
  ) {
    throw unsafeUrl(raw, "Expected a Comix title or chapter page");
  }
  return url;
};

const initialData = (html: string, url: string): Record<string, unknown> => {
  const $ = load(html);
  try {
    const data: unknown = JSON.parse($("#initial-data").text());
    if (object(data)) return data;
  } catch {
    /* A challenge or changed page is not a reader document. */
  }
  throw new AppError("PARSE_FAILED", "Comix initial data is missing", { url });
};

const titleOf = (
  data: Record<string, unknown>,
  hid: string,
  url: string,
): string => {
  if (object(data.queries)) {
    const detail = data.queries[JSON.stringify(["manga", "detail", hid])];
    if (
      object(detail) &&
      detail.hid === hid &&
      typeof detail.title === "string" &&
      detail.title.trim()
    ) {
      return detail.title;
    }
  }
  throw new AppError(
    "PARSE_FAILED",
    "Comix title data does not match the requested series",
    { url },
  );
};

export const parseComixSeriesPage = (html: string, pageUrl: string) => {
  const url = comixPageUrl(pageUrl);
  const hid = TITLE_PATH.exec(url.pathname)?.[1];
  if (!hid)
    throw new AppError("INVALID_URL", "Expected a Comix title page", {
      url: pageUrl,
    });
  const title = titleOf(initialData(html, pageUrl), hid, pageUrl);
  const $ = load(html);
  const candidates: { chapter: ChapterRef; group: string }[] = [];
  $(".mchap-item").each((_index, element) => {
    const row = $(element);
    const href = row.find("a.mchap-row__primary").attr("href") ?? "";
    const link = parsePublicUrl(href, pageUrl);
    const match = link && CHAPTER_PATH.exec(link.pathname);
    if (
      !link ||
      link.hostname !== "comix.to" ||
      link.port ||
      !match?.[2] ||
      match[1] !== hid
    )
      return;
    const label = row.find(".mchap-row__ch").text().trim();
    const chapterNumber = /^(?:Ch\.?|Chapter)\s*(\d+(?:\.\d+)?)$/i.exec(
      label,
    )?.[1];
    const number = chapterNumber === undefined ? null : Number(chapterNumber);
    const group = row.find(".mchap-row__group").text().trim();
    candidates.push({
      group,
      chapter: {
        id: match[2],
        number,
        label: `${label || `Chapter ${match[2]}`}${group ? ` · ${group}` : ""}`,
        url: link.toString(),
        date: row.find(".mchap-row__time").text().trim() || null,
      },
    });
  });
  if (!candidates.length)
    throw new AppError(
      "BLOCKED",
      "Comix chapter list requires the browser reader",
      { url: pageUrl },
    );
  if (candidates.length > 10_000)
    throw new AppError("PARSE_FAILED", "Too many Comix chapters", {
      url: pageUrl,
    });
  // The downloader uses one folder per number. Prefer the most complete translation
  // group, then use other groups only for numbers it does not provide.
  const groups = new Map<string, Set<number | string>>();
  for (const { chapter, group } of candidates) {
    const numbers = groups.get(group) ?? new Set<number | string>();
    numbers.add(chapter.number ?? chapter.id);
    groups.set(group, numbers);
  }
  const ranked = candidates.sort(
    (a, b) =>
      (groups.get(b.group)?.size ?? 0) - (groups.get(a.group)?.size ?? 0) ||
      a.group.localeCompare(b.group) ||
      Number(b.chapter.id) - Number(a.chapter.id),
  );
  const chosen = new Map<string, ChapterRef>();
  for (const { chapter } of ranked) {
    const key =
      chapter.number === null ? `id:${chapter.id}` : `number:${chapter.number}`;
    if (!chosen.has(key)) chosen.set(key, chapter);
  }
  return { title, chapters: sortChapters([...chosen.values()]) };
};

export const parseComixChapterPage = (
  html: string,
  pageUrl: string,
): Pick<ChapterPages, "imageUrls" | "pageNumber" | "pageTitle"> => {
  const url = comixPageUrl(pageUrl);
  const match = CHAPTER_PATH.exec(url.pathname);
  if (!match?.[1] || !match[2])
    throw new AppError("INVALID_URL", "Expected a Comix chapter page", {
      url: pageUrl,
    });
  const data = initialData(html, pageUrl);
  const title = titleOf(data, match[1], pageUrl);
  if (
    !object(data.read) ||
    String(data.read.chapterId) !== match[2] ||
    data.read.mangaHid !== match[1] ||
    typeof data.read.chapterNumber !== "number" ||
    !Number.isFinite(data.read.chapterNumber)
  ) {
    throw new AppError(
      "CHAPTER_MISMATCH",
      "Comix reader returned a different chapter",
      { url: pageUrl },
    );
  }
  const $ = load(html);
  const pages = $(".rpage-page[data-page]");
  if (pages.length > 2_000)
    throw new AppError("PARSE_FAILED", "Too many Comix images", {
      url: pageUrl,
    });
  const images = new Map<number, string>();
  pages.each((_index, element) => {
    const page = $(element);
    const number = Number(page.attr("data-page"));
    const src = page.find("img.rpage-page__img").attr("src");
    const image = src && parsePublicUrl(src, pageUrl);
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      !image ||
      images.has(number) ||
      page.find("canvas").length
    ) {
      throw new AppError(
        "PARSE_FAILED",
        "Comix page is missing, protected, or has an unsafe image URL",
        { url: pageUrl },
      );
    }
    images.set(number, image.toString());
  });
  const ordered = [...images].sort(([a], [b]) => a - b);
  if (ordered.some(([number], index) => number !== index + 1)) {
    throw new AppError("PARSE_FAILED", "Comix page sequence is incomplete", {
      url: pageUrl,
    });
  }
  return {
    imageUrls: ordered.map(([, image]) => image),
    pageNumber: data.read.chapterNumber,
    pageTitle: `${title} Chapter ${data.read.chapterNumber}`,
  };
};

export const comix: SiteAdapter = {
  id: "comix",
  name: "Comix",
  domains: ["comix.to"],
  exampleUrl: "https://comix.to/title/gmv6g-can-life-be-monetized",
  engine: "Comix · Browser reader",
  matches: (url) => url.hostname === "comix.to",
  getSeries: async (input, http) => {
    const url = comixPageUrl(input.toString());
    if (!TITLE_PATH.test(url.pathname))
      throw new AppError("INVALID_URL", "Expected /title/<series>");
    url.search = "";
    url.hash = "";
    const { text, finalUrl } = await http.getText(url.toString());
    if (comixPageUrl(finalUrl).pathname !== url.pathname)
      throw unsafeUrl(finalUrl, "Redirected to another series");
    const parsed = parseComixSeriesPage(text, finalUrl);
    return {
      ...parsed,
      siteId: "comix",
      siteName: "Comix",
      url: url.toString(),
      missingNumbers: findMissingNumbers(parsed.chapters),
    };
  },
  getPages: async (chapter, http) => {
    comixPageUrl(chapter.url);
    const { text, finalUrl } = await http.getText(chapter.url);
    if (comixPageUrl(finalUrl).pathname !== new URL(chapter.url).pathname) {
      throw new AppError(
        "CHAPTER_MISMATCH",
        "Comix redirected to another chapter",
        { url: finalUrl },
      );
    }
    return { ...parseComixChapterPage(text, finalUrl), referer: "", finalUrl };
  },
};
