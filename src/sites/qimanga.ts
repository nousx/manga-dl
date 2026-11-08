import { AppError } from "../core/errors";
import { parsePublicUrl, unsafeUrl } from "../core/net";
import { findMissingNumbers, sortChapters } from "../core/series";
import type {
  ChapterPages,
  ChapterRef,
  Http,
  SiteAdapter,
} from "../core/types";

const HOST = "qimanga.com";
const API = "https://api.qimanga.com/api";
const SERIES_PATH = /^\/series\/([\w-]+)\/?$/;
const CHAPTER_PATH = /^\/series\/([\w-]+)\/([\w-]+)\/?$/;
const SLUG = /^[\w-]+$/;
// the API refuses more than 100 per page
const LIST_LIMIT = 100;
const MAX_CHAPTERS = 10_000;
const MAX_PAGES = 2_000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const siteHost = (url: URL): string => url.hostname.replace(/^www\./, "");
const invalid = (message: string, url: string): AppError =>
  new AppError("PARSE_FAILED", message, { url });

/** Fetches one API document; a redirect off the API host is refused. */
const getJson = async (http: Http, url: string): Promise<unknown> => {
  const { text, finalUrl } = await http.getText(url, `https://${HOST}/`);
  if (new URL(finalUrl).hostname !== new URL(API).hostname)
    throw unsafeUrl(finalUrl, "redirected away from the Qi Manga API");
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new AppError(
      "PARSE_FAILED",
      "API response is not JSON",
      { url },
      cause,
    );
  }
};

const locked = (record: Record<string, unknown>): boolean =>
  record.requiresPurchase === true;

/** One page of `GET /v2/series/<slug>/chapters`. */
export const parseQiChapterList = (
  value: unknown,
  seriesSlug: string,
  url: string,
): { chapters: ChapterRef[]; nextCursor: string | null } => {
  if (!isObject(value) || !Array.isArray(value.data))
    throw invalid("Invalid chapter list", url);
  const chapters = value.data.map((chapter: unknown): ChapterRef => {
    if (
      !isObject(chapter) ||
      !isNumber(chapter.number) ||
      typeof chapter.slug !== "string" ||
      !SLUG.test(chapter.slug)
    ) {
      throw invalid("Invalid chapter record", url);
    }
    const title =
      typeof chapter.title === "string" && chapter.title.trim()
        ? ` ${chapter.title.trim()}`
        : "";
    return {
      id: chapter.slug,
      number: chapter.number,
      label: `Chapter ${chapter.number}${title}${locked(chapter) ? " (ล็อก)" : ""}`,
      url: `https://${HOST}/series/${seriesSlug}/${chapter.slug}`,
      date: typeof chapter.createdAt === "string" ? chapter.createdAt : null,
    };
  });
  const cursor = value.nextCursor;
  const more = value.hasMore === true;
  if (more && (typeof cursor !== "string" || cursor === ""))
    throw invalid("Chapter list says there is more but gives no cursor", url);
  return { chapters, nextCursor: more ? (cursor as string) : null };
};

/** `GET /v1/series/<slug>/chapters/<chapter>`. */
export const parseQiChapter = (
  value: unknown,
  url: string,
): Pick<ChapterPages, "imageUrls" | "pageTitle" | "pageNumber"> => {
  if (
    !isObject(value) ||
    !isNumber(value.number) ||
    !Array.isArray(value.images)
  )
    throw invalid("Invalid chapter data", url);
  // the server sends no images for a chapter that is not bought; nothing to bypass
  if (locked(value) && value.images.length === 0) {
    throw new AppError(
      "CHAPTER_NO_IMAGES",
      "This chapter must be bought on Qi Manga; no public download is available",
      { url },
    );
  }
  if (value.images.length > MAX_PAGES)
    throw invalid("Too many chapter images", url);
  const images = value.images
    .map((image: unknown) => {
      if (
        !isObject(image) ||
        !isNumber(image.order) ||
        typeof image.url !== "string"
      )
        throw invalid("Invalid image record", url);
      const link = parsePublicUrl(image.url);
      if (!link) throw unsafeUrl(image.url, "Invalid chapter image URL");
      return { order: image.order, url: link.toString() };
    })
    .sort((a, b) => a.order - b.order);
  const series =
    isObject(value.series) && typeof value.series.title === "string"
      ? value.series.title
      : null;
  return {
    imageUrls: images.map((image) => image.url),
    pageNumber: value.number,
    pageTitle: series === null ? null : `${series} Chapter ${value.number}`,
  };
};

export const qimanga: SiteAdapter = {
  id: "qimanga",
  name: "Qi Manga",
  domains: [HOST],
  exampleUrl: "https://qimanga.com/series/agent-reborn",
  engine: "Angular · Qi Manga API",
  matches: (url) => siteHost(url) === HOST,

  async getSeries(url, http) {
    const slug = SERIES_PATH.exec(url.pathname)?.[1];
    if (siteHost(url) !== HOST || !slug) {
      throw new AppError(
        "INVALID_URL",
        "Expected https://qimanga.com/series/<name>",
        {
          url: url.toString(),
          expectedPrefix: "/series/",
        },
      );
    }
    const series = await getJson(http, `${API}/v1/series/${slug}`);
    if (
      !isObject(series) ||
      typeof series.title !== "string" ||
      !series.title.trim()
    )
      throw invalid("Series title is missing", url.toString());

    const byId = new Map<string, ChapterRef>();
    const seen = new Set<string>();
    let cursor: string | null = "";
    while (cursor !== null) {
      // a cursor that repeats would loop forever
      if (seen.has(cursor))
        throw invalid("Chapter list cursor repeats", url.toString());
      seen.add(cursor);
      const listUrl = new URL(`${API}/v2/series/${slug}/chapters`);
      listUrl.searchParams.set("limit", String(LIST_LIMIT));
      if (cursor) listUrl.searchParams.set("cursor", cursor);
      const page = parseQiChapterList(
        await getJson(http, listUrl.toString()),
        slug,
        listUrl.toString(),
      );
      for (const chapter of page.chapters) byId.set(chapter.id, chapter);
      if (byId.size > MAX_CHAPTERS)
        throw invalid("Too many chapters", url.toString());
      cursor = page.nextCursor;
    }
    if (byId.size === 0)
      throw new AppError("CHAPTER_LIST_EMPTY", "No chapters listed", {
        url: url.toString(),
      });
    const chapters = sortChapters([...byId.values()]);
    return {
      siteId: "qimanga",
      siteName: "Qi Manga",
      url: `https://${HOST}/series/${slug}`,
      title: series.title.trim(),
      chapters,
      missingNumbers: findMissingNumbers(chapters),
    };
  },

  async getPages(chapter, http) {
    const page = parsePublicUrl(chapter.url);
    const match =
      page && siteHost(page) === HOST ? CHAPTER_PATH.exec(page.pathname) : null;
    if (!match?.[1] || !match[2])
      throw unsafeUrl(chapter.url, "Not a Qi Manga chapter URL");
    const apiUrl = `${API}/v1/series/${match[1]}/chapters/${match[2]}`;
    return {
      ...parseQiChapter(await getJson(http, apiUrl), apiUrl),
      referer: `https://${HOST}/`,
      finalUrl: chapter.url,
    };
  },
};
