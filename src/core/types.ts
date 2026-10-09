export interface ChapterRef {
  /** Stable key for the chapter inside one series (the URL slug). */
  id: string;
  number: number | null;
  label: string;
  url: string;
  date: string | null;
}

export interface Series {
  siteId: string;
  siteName: string;
  url: string;
  title: string;
  /** Sorted oldest first. */
  chapters: ChapterRef[];
  /** Whole chapter numbers the source site does not list. */
  missingNumbers: number[];
}

export interface ChapterPages {
  imageUrls: string[];
  /** Referer header to send when fetching the images. */
  referer: string;
  /** URL the chapter page actually resolved to after redirects. */
  finalUrl: string;
  pageTitle: string | null;
  /** Chapter number the page itself claims to be, used to catch wrong redirects. */
  pageNumber: number | null;
}

export interface TextResponse {
  text: string;
  finalUrl: string;
}

export interface Http {
  getText(url: string, referer?: string): Promise<TextResponse>;
  getBytes(url: string, referer?: string): Promise<Buffer>;
}

/**
 * One module per site (or per shared theme). The core never knows how a site
 * is laid out; it only calls these three members.
 */
export interface SiteAdapter {
  id: string;
  name: string;
  domains: string[];
  exampleUrl: string;
  engine: string;
  matches(url: URL): boolean;
  getSeries(url: URL, http: Http): Promise<Series>;
  getPages(chapter: ChapterRef, http: Http): Promise<ChapterPages>;
}
