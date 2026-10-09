import { load } from "cheerio";
import { AppError } from "../../core/errors";
import { parsePublicUrl, unsafeUrl } from "../../core/net";
import { findMissingNumbers, sortChapters } from "../../core/series";
import type {
  ChapterPages,
  ChapterRef,
  Http,
  Series,
  SiteAdapter,
} from "../../core/types";

/**
 * Shared logic for sites built on the WordPress "MangaReader" theme (Themesia).
 * A site module only supplies this config; add fields here when a site deviates.
 */
export interface MangaReaderConfig {
  id: string;
  name: string;
  hosts: string[];
  exampleUrl: string;
  /** Path prefix of series pages, e.g. "/manga/". */
  seriesPathPrefix: string;
}

// far above any real series; a page past these is broken or hostile
const MAX_CHAPTERS = 10_000;
const MAX_IMAGES = 2_000;

const siteHost = (url: URL): string => url.hostname.replace(/^www\./, "");

interface ReaderPayload {
  sources?: { source?: string; images?: unknown[] }[];
}

const parseNumber = (text: string | undefined): number | null => {
  if (text === undefined || text.trim() === "") return null;
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : null;
};

const numberFromLabel = (label: string): number | null =>
  parseNumber(
    /(?:chapter|ch\.?|ตอนที่|ตอน)\s*(\d+(?:\.\d+)?)/i.exec(label)?.[1],
  );

const slugOf = (url: string): string =>
  new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;

/** `hosts` is the site's own list of domains (without "www."). */
export const parseSeriesPage = (
  html: string,
  pageUrl: string,
  hosts: string[],
): Pick<Series, "title" | "chapters"> => {
  const $ = load(html);
  const title = $("h1.entry-title").first().text().trim();
  if (title === "") {
    throw new AppError(
      "PARSE_FAILED",
      "Series title (h1.entry-title) not found",
      { url: pageUrl, selector: "h1.entry-title" },
    );
  }

  const byUrl = new Map<string, ChapterRef>();
  $("#chapterlist li").each((_index, element) => {
    const item = $(element);
    const href = item.find("a[href]").first().attr("href");
    if (!href) return;
    // page content is untrusted: a chapter link must stay on the site itself.
    // The check uses the module's own host list, never a URL the server chose.
    const link = parsePublicUrl(href, pageUrl);
    if (!link || !hosts.includes(siteHost(link))) return;
    const url = link.toString();
    const label = item.find(".chapternum").first().text().trim() || slugOf(url);
    byUrl.set(url, {
      id: slugOf(url),
      number: parseNumber(item.attr("data-num")) ?? numberFromLabel(label),
      label,
      url,
      date: item.find(".chapterdate").first().text().trim() || null,
    });
  });
  if (byUrl.size === 0) {
    throw new AppError(
      "CHAPTER_LIST_EMPTY",
      "No chapters found in #chapterlist",
      { url: pageUrl, selector: "#chapterlist li" },
    );
  }
  if (byUrl.size > MAX_CHAPTERS) {
    throw new AppError(
      "PARSE_FAILED",
      `Chapter list is too long (${byUrl.size} entries)`,
      { url: pageUrl, limit: MAX_CHAPTERS },
    );
  }
  return { title, chapters: sortChapters([...byUrl.values()]) };
};

const imagesFromReaderScript = (html: string): string[] | null => {
  const match = /ts_reader\.run\((\{[\s\S]*?\})\);/.exec(html);
  if (!match?.[1]) return null;
  let payload: ReaderPayload;
  try {
    payload = JSON.parse(match[1]) as ReaderPayload;
  } catch (cause) {
    throw new AppError(
      "PARSE_FAILED",
      "ts_reader.run payload is not valid JSON",
      {},
      cause,
    );
  }
  const source = payload.sources?.find(
    (candidate) => (candidate.images?.length ?? 0) > 0,
  );
  return (source?.images ?? []).filter(
    (image): image is string => typeof image === "string",
  );
};

export const parseChapterPage = (
  html: string,
  pageUrl: string,
): Pick<ChapterPages, "imageUrls" | "pageTitle" | "pageNumber"> => {
  const $ = load(html);
  const pageTitle = $("h1.entry-title").first().text().trim() || null;
  const reader = $("#readerarea");
  const scripted = imagesFromReaderScript(html);
  if (scripted === null && reader.length === 0) {
    throw new AppError(
      "PARSE_FAILED",
      "Reader not found (no ts_reader.run and no #readerarea)",
      { url: pageUrl },
    );
  }
  // the noscript copy inside #readerarea is the fallback when the script payload is absent
  const fallback = (): string[] =>
    load(reader.find("noscript").html() ?? reader.html() ?? "")("img")
      .map(
        (_index, image) =>
          $(image).attr("data-src") ?? $(image).attr("src") ?? "",
      )
      .get();
  const raw = scripted && scripted.length > 0 ? scripted : fallback();
  if (raw.length > MAX_IMAGES) {
    throw new AppError(
      "PARSE_FAILED",
      `Chapter lists too many images (${raw.length})`,
      { url: pageUrl, limit: MAX_IMAGES },
    );
  }
  // images may live on another host (a CDN), but never on a local address
  const imageUrls = [
    ...new Set(
      raw
        .filter((image) => image !== "")
        .map((image) => parsePublicUrl(image, pageUrl)?.toString() ?? "")
        .filter((image) => image !== ""),
    ),
  ];
  return {
    imageUrls,
    pageTitle,
    pageNumber: pageTitle === null ? null : numberFromLabel(pageTitle),
  };
};

export const createMangaReaderAdapter = (
  config: MangaReaderConfig,
): SiteAdapter => {
  // a redirect can land anywhere; only pages served by the site are parsed
  const requireOnSite = (finalUrl: string): void => {
    if (!config.hosts.includes(siteHost(new URL(finalUrl))))
      throw unsafeUrl(finalUrl, `redirected away from ${config.name}`);
  };
  return {
    id: config.id,
    name: config.name,
    domains: config.hosts,
    exampleUrl: config.exampleUrl,
    engine: "WordPress · MangaReader (Themesia)",
    matches: (url) => config.hosts.includes(url.hostname.replace(/^www\./, "")),

    async getSeries(url: URL, http: Http): Promise<Series> {
      if (
        !url.pathname.startsWith(config.seriesPathPrefix) ||
        url.pathname === config.seriesPathPrefix
      ) {
        throw new AppError(
          "INVALID_URL",
          `Not a series page; expected ${url.origin}${config.seriesPathPrefix}<name>/`,
          {
            url: url.toString(),
            expectedPrefix: config.seriesPathPrefix,
          },
        );
      }
      const { text, finalUrl } = await http.getText(url.toString());
      requireOnSite(finalUrl);
      const { title, chapters } = parseSeriesPage(text, finalUrl, config.hosts);
      return {
        siteId: config.id,
        siteName: config.name,
        url: finalUrl,
        title,
        chapters,
        missingNumbers: findMissingNumbers(chapters),
      };
    },

    async getPages(chapter: ChapterRef, http: Http): Promise<ChapterPages> {
      const { text, finalUrl } = await http.getText(chapter.url);
      requireOnSite(finalUrl);
      return {
        ...parseChapterPage(text, finalUrl),
        referer: `${new URL(finalUrl).origin}/`,
        finalUrl,
      };
    },
  };
};
