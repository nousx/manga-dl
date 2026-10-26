import { load } from "cheerio";
import { AppError } from "../core/errors";
import { parsePublicUrl, unsafeUrl } from "../core/net";
import { findMissingNumbers, sortChapters } from "../core/series";
import type { ChapterPages, ChapterRef, SiteAdapter } from "../core/types";

const HOST = "divascans.org";
const SERIES_PATH = /^\/series\/comic\/([^/]+)\/?$/;
const MAX_CHAPTERS = 10_000;
const MAX_PAGES = 2_000;
const MAX_LIST_PAGES = 100;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const onSite = (url: URL): boolean =>
  url.hostname.replace(/^www\./, "") === HOST;
const requireOnSite = (raw: string): URL => {
  const url = parsePublicUrl(raw);
  if (!url || !onSite(url)) throw unsafeUrl(raw, "Not a Diva Scans URL");
  return url;
};
const invalid = (message: string, url: string): AppError =>
  new AppError("PARSE_FAILED", message, { url });

/** Decode Next.js Flight JSON only; never execute scripts supplied by a site. */
const readerProps = (
  html: string,
  pageUrl: string,
  kind: "series" | "chapter",
): Record<string, unknown> => {
  const $ = load(html);
  const chunks: string[] = [];
  $("script").each((_index, element) => {
    const script = $(element).html()?.trim() ?? "";
    const match = /^self\.__next_f\.push\(([\s\S]*)\);?$/.exec(script);
    if (!match?.[1]) return;
    try {
      const chunk: unknown = JSON.parse(match[1]);
      if (
        Array.isArray(chunk) &&
        chunk[0] === 1 &&
        typeof chunk[1] === "string"
      ) {
        chunks.push(chunk[1]);
      }
    } catch {
      throw invalid("Invalid Next.js data chunk", pageUrl);
    }
  });
  const pending: unknown[] = [];
  for (const line of chunks.join("").split("\n")) {
    const match = /^[\da-f]+:([\[{][\s\S]*)$/i.exec(line);
    if (!match?.[1]) continue;
    try {
      pending.push(JSON.parse(match[1]));
    } catch {
      throw invalid("Invalid Next.js JSON record", pageUrl);
    }
  }
  let visited = 0;
  while (pending.length > 0) {
    const value = pending.pop();
    visited += 1;
    if (visited > 100_000)
      throw invalid("Next.js data is too complex", pageUrl);
    if (Array.isArray(value)) pending.push(...value);
    else if (isObject(value)) {
      if (
        isObject(value.series) &&
        (kind === "series"
          ? Array.isArray(value.chapters)
          : isObject(value.chapter))
      ) {
        return value;
      }
      pending.push(...Object.values(value));
    }
  }
  throw invalid(`No Diva Scans ${kind} data found`, pageUrl);
};

const checkSeries = (
  value: unknown,
  pageUrl: string,
): Record<string, unknown> => {
  if (
    !isObject(value) ||
    typeof value.title !== "string" ||
    !value.title.trim()
  ) {
    throw invalid("Series title is missing", pageUrl);
  }
  const slug = new URL(pageUrl).pathname.split("/")[3];
  if (value.urlSlug !== slug && value.slug !== slug) {
    throw invalid("Series data does not match the requested URL", pageUrl);
  }
  return value;
};

export const parseDivaSeriesPage = (html: string, pageUrl: string) => {
  const url = requireOnSite(pageUrl);
  if (!SERIES_PATH.test(url.pathname))
    throw invalid("Not a comic series page", pageUrl);
  const props = readerProps(html, pageUrl, "series");
  const series = checkSeries(props.series, pageUrl);
  const raw = props.chapters;
  if (!Array.isArray(raw) || raw.length > MAX_CHAPTERS)
    throw invalid("Invalid chapter list", pageUrl);
  const currentPage = props.currentPage;
  const totalPages = props.totalPages;
  if (
    !isNumber(currentPage) ||
    !Number.isInteger(currentPage) ||
    currentPage < 1 ||
    !isNumber(totalPages) ||
    !Number.isInteger(totalPages) ||
    totalPages < 1 ||
    totalPages > MAX_LIST_PAGES ||
    currentPage > totalPages
  ) {
    throw invalid("Invalid chapter list pagination", pageUrl);
  }
  const $ = load(html);
  const links = new Map<number, string>();
  const prefix = `${url.pathname.replace(/\/$/, "")}/chapter/`;
  $("a[href]").each((_index, element) => {
    const link = parsePublicUrl($(element).attr("href") ?? "", pageUrl);
    if (!link || !onSite(link) || !link.pathname.startsWith(prefix)) return;
    const tail = link.pathname.slice(prefix.length).replace(/\/$/, "");
    if (!/^\d+(?:\.\d+)?$/.test(tail)) return;
    link.search = "";
    link.hash = "";
    links.set(Number(tail), link.toString());
  });
  const chapters: ChapterRef[] = raw.map((chapter: unknown) => {
    if (
      !isObject(chapter) ||
      !isNumber(chapter.number) ||
      typeof chapter.id !== "string" ||
      !/^[\w-]+$/.test(chapter.id)
    ) {
      throw invalid("Invalid chapter record", pageUrl);
    }
    const link = links.get(chapter.number);
    if (!link)
      throw invalid(
        `Missing on-site link for chapter ${chapter.number}`,
        pageUrl,
      );
    return {
      id: chapter.id,
      number: chapter.number,
      label: `Chapter ${chapter.number}${chapter.isLocked === true && chapter.hasAccess !== true ? " (ล็อก)" : ""}`,
      url: link,
      date:
        typeof chapter.publishedAt === "string" ? chapter.publishedAt : null,
    };
  });
  if (chapters.length === 0)
    throw new AppError("CHAPTER_LIST_EMPTY", "No chapters listed", {
      url: pageUrl,
    });
  return {
    title: series.title as string,
    chapters: sortChapters(chapters),
    currentPage,
    totalPages,
  };
};

export const parseDivaChapterPage = (
  html: string,
  pageUrl: string,
): Pick<ChapterPages, "imageUrls" | "pageTitle" | "pageNumber"> => {
  requireOnSite(pageUrl);
  const props = readerProps(html, pageUrl, "chapter");
  const series = checkSeries(props.series, pageUrl);
  const chapter = props.chapter;
  if (
    !isObject(chapter) ||
    !isNumber(chapter.number) ||
    !Array.isArray(chapter.pages)
  ) {
    throw invalid("Invalid chapter data", pageUrl);
  }
  if (
    props.isUnlocked === false ||
    (props.isLocked === true && props.isUnlocked !== true)
  ) {
    throw new AppError(
      "CHAPTER_NO_IMAGES",
      "This chapter is locked; no public download is available",
      { url: pageUrl },
    );
  }
  const protection = props.protectionConfig;
  // Diva can retain old tile/strip metadata after protection is switched off.
  // In that case the public imageUrl is already the complete original image.
  // Require the explicit disabled configuration before accepting that fallback.
  const originalsAvailable =
    isObject(protection) &&
    protection.isProtected === false &&
    [
      "useCanvasRendering",
      "useTileEncryption",
      "useFragmentProtection",
      "useImageScramble",
    ].every((key) => protection[key] === false);
  if (
    isObject(protection) &&
    ["useTileEncryption", "useFragmentProtection", "useImageScramble"].some(
      (key) => protection[key] === true,
    )
  ) {
    throw invalid("Protected image formats are not supported", pageUrl);
  }
  if (chapter.pages.length > MAX_PAGES)
    throw invalid("Too many chapter images", pageUrl);
  const pages = chapter.pages
    .map((page: unknown) => {
      if (
        !isObject(page) ||
        !isNumber(page.pageNumber) ||
        !Number.isInteger(page.pageNumber) ||
        page.pageNumber < 1 ||
        typeof page.imageUrl !== "string" ||
        !page.imageUrl.trim()
      ) {
        throw invalid("Invalid page record", pageUrl);
      }
      if (
        page.isRedacted === true ||
        (!originalsAvailable &&
          (page.isEncrypted === true ||
            page.hasStrips === true ||
            page.hasFragments === true))
      ) {
        throw invalid(
          "A page is redacted or uses an unsupported protected format",
          pageUrl,
        );
      }
      const image = parsePublicUrl(page.imageUrl, pageUrl);
      if (!image) throw unsafeUrl(page.imageUrl, "Invalid chapter image URL");
      return { number: page.pageNumber, url: image.toString() };
    })
    .sort((a, b) => a.number - b.number);
  if (pages.some((page, index) => page.number !== index + 1)) {
    throw invalid("Chapter page numbers are missing or duplicated", pageUrl);
  }
  return {
    imageUrls: pages.map((page) => page.url),
    pageNumber: chapter.number,
    pageTitle: `${series.title} Chapter ${chapter.number}`,
  };
};

export const divascans: SiteAdapter = {
  id: "divascans",
  name: "Diva Scans",
  domains: [HOST],
  exampleUrl: "https://divascans.org/series/comic/can-life-be-monetized",
  engine: "Next.js · Diva Scans reader",
  matches: onSite,
  getSeries: async (input, http) => {
    const url = requireOnSite(input.toString());
    if (!SERIES_PATH.test(url.pathname))
      throw new AppError("INVALID_URL", "Expected /series/comic/<title>", {
        url: input.toString(),
      });
    url.search = "";
    url.hash = "";
    const chapters = new Map<string, ChapterRef>();
    let title = "";
    let lastPage = 1;
    for (let page = 1; page <= lastPage; page += 1) {
      const request = new URL(url);
      if (page > 1) request.searchParams.set("page", String(page));
      const response = await http.getText(request.toString());
      const finalUrl = requireOnSite(response.finalUrl);
      if (
        finalUrl.pathname.replace(/\/$/, "") !== url.pathname.replace(/\/$/, "")
      ) {
        throw unsafeUrl(response.finalUrl, "Redirected to another series");
      }
      const parsed = parseDivaSeriesPage(response.text, response.finalUrl);
      if (parsed.currentPage !== page)
        throw invalid(
          "Server returned the wrong chapter list page",
          response.finalUrl,
        );
      title = parsed.title;
      lastPage = parsed.totalPages;
      for (const chapter of parsed.chapters) chapters.set(chapter.id, chapter);
      if (chapters.size > MAX_CHAPTERS)
        throw invalid("Too many chapters", response.finalUrl);
    }
    const sorted = sortChapters([...chapters.values()]);
    return {
      siteId: "divascans",
      siteName: "Diva Scans",
      url: url.toString(),
      title,
      chapters: sorted,
      missingNumbers: findMissingNumbers(sorted),
    };
  },
  getPages: async (chapter, http) => {
    requireOnSite(chapter.url);
    const response = await http.getText(chapter.url);
    requireOnSite(response.finalUrl);
    if (
      new URL(response.finalUrl).pathname.replace(/\/$/, "") !==
      new URL(chapter.url).pathname.replace(/\/$/, "")
    ) {
      throw new AppError(
        "CHAPTER_MISMATCH",
        "Redirected to a different chapter",
        { url: response.finalUrl },
      );
    }
    return {
      ...parseDivaChapterPage(response.text, response.finalUrl),
      referer: `${new URL(response.finalUrl).origin}/`,
      finalUrl: response.finalUrl,
    };
  },
};
