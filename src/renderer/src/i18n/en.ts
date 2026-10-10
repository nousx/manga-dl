import type { Messages } from "./types";

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const en: Messages = {
  intlLocale: "en-US",
  nav: {
    label: "Main pages",
    download: "Download",
    history: "History",
    sites: "Supported sites",
  },
  pageTitle: {
    download: "Download",
    history: "Download history",
    sites: "Supported sites",
  },
  working: "Working",
  common: {
    close: "Close",
    clear: "Clear",
    openSeriesFolder: "Open series folder",
    pages: (done, total) => `${done}/${total} pages`,
  },
  sidebar: {
    downloading: "Downloading",
    chapters: (done, total) => `${done}/${total} chapters`,
    viewProgress: "View progress",
    ready: "Ready",
    readyHint: "Images are saved on your computer",
  },
  settings: {
    summary: "Download settings",
    summaryDetail: (images, delayMs) =>
      `${plural(images, "image", "images")} at once · ${delayMs} ms`,
    saveTo: "Save to",
    change: "Change",
    openFolder: "Open folder",
    concurrencyBefore: "Download",
    concurrencyAfter: "images at once",
    delay: "Delay",
    language: "Language",
  },
  empty: {
    title: "From the web page to your folder",
    line1: "Paste a series link, then press “Fetch”",
    line2: "Pick the chapters you want. Images are saved in reading order.",
    viewSites: "See supported sites",
  },
  url: {
    label: "Series link",
    placeholder: "https://arenascan.com/manga/<series-name>/",
    fetch: "Fetch",
    fetching: "Fetching...",
  },
  status: {
    none: "Not downloaded",
    queued: "Queued",
    running: "Downloading",
    done: "Complete",
    incomplete: "Incomplete",
    failed: "Failed",
  },
  series: {
    meta: (site, total, done) =>
      `${site} · ${plural(total, "chapter", "chapters")} · ${done} complete on disk`,
    gaps: (count, listed, more) =>
      `The source site is missing ${plural(count, "chapter", "chapters")}: ${listed}${more > 0 ? ` and ${more} more` : ""}`,
    selectAll: "Select all",
    selectUnfinished: "Select unfinished",
    rangeLabel: "Chapter range, e.g. 1-20",
    selectRange: "Select range",
    cancel: "Cancel",
    download: (count) => `Download ${plural(count, "chapter", "chapters")}`,
    overallProgress: "Overall progress",
    jobProgress: (finished, total, size) =>
      `${finished}/${total} chapters · ${size}`,
  },
  summary: {
    line: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "Cancelled" : "Finished"}: ${done} done · ${skipped} skipped (already complete) · ${incomplete} incomplete · ${failed} failed`,
    failedPages: (count, list) =>
      `${plural(count, "page", "pages")} failed (page ${list})`,
    selectFailures: "Select only chapters with problems",
  },
  log: {
    title: "Activity log",
    errorCount: (count) => plural(count, "error", "errors"),
    problemsOnly: "Problems only",
    logFiles: "Log files",
    previous: "Previous",
    next: "Next",
    range: (from, to, total) => `${from}–${to} of ${total}`,
    follow: "Follow latest",
    empty: "Nothing yet",
    jobStart: (title, count) =>
      `Started "${title}": ${plural(count, "chapter", "chapters")}`,
    chapterPages: (label, count) =>
      `${label}: found ${plural(count, "page", "pages")}, downloading`,
    pageFailed: (label, index, reason) => `${label} page ${index}: ${reason}`,
    retry: (attempt, max, seconds) => `Retry ${attempt}/${max} in ${seconds} s`,
    chapterDone: (label, pages) => `${label}: done, ${pages}`,
    chapterSkipped: (label, pages) =>
      `${label}: skipped, already complete, ${pages}`,
    chapterIncomplete: (label, pages, reason) =>
      `${label}: incomplete, ${pages} (${reason})`,
    chapterFailed: (label, reason) => `${label}: failed (${reason})`,
    somePagesFailed: "some pages failed",
    jobDone: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "Cancelled" : "Finished"}: ${done} done, ${skipped} skipped, ${incomplete} incomplete, ${failed} failed`,
    jobError: (reason) => `The job stopped early: ${reason}`,
  },
  history: {
    heading: "Saved series",
    description:
      "Read from the history in the selected folder. It stays after you close the app.",
    refresh: "Refresh",
    reading: "Reading…",
    currentFolder: "Current folder",
    readingHistory: "Reading history from disk…",
    issues: (count) =>
      `${plural(count, "entry", "entries")} could not be read. Check the files or permissions, then refresh.`,
    reasons: {
      missing: "file not found",
      unreadable: "cannot be read",
      malformed: "invalid data",
      unsafe: "skipped a link to another file or folder",
    },
    emptyTitle: "Start with your first series",
    emptyLine1: "Downloaded chapters are grouped by series here.",
    emptyLine2:
      "See what is complete, what needs a retry, and open the folder.",
    goDownload: "Go to Download",
    caption: (count) =>
      `${plural(count, "series", "series")} · most recently updated first`,
    complete: (count) => `${count} complete`,
    incomplete: (count) => `${count} incomplete`,
    failed: (count) => `${count} failed`,
    continueSeries: "Continue this series",
    waitForJob: "Wait for the current job before switching series",
  },
  sites: {
    heading: "Sites ready to use",
    description:
      "Paste a series link from one of these sites to pick chapters.",
    count: (count) => plural(count, "site", "sites"),
    supported: "Supported",
    engine: "Engine",
    exampleLink: "Example link",
    tryExample: "Try this series",
    copyLink: "Copy link",
    copied: "Link copied",
    copyFailed: "Could not copy. Select the link above and press Ctrl+C.",
    waitForJob: "You can switch series when the current job ends",
    addTitle: "More sites can be added",
    addBefore: "Add a site file in",
    addBetween: "and register it in",
    addAfter: "",
    addShared: "Sites built on the same theme share one reader module.",
  },
  update: {
    checking: "Checking for updates…",
    upToDate: "You have the latest version",
    downloading: (version, percent) =>
      `Downloading version ${version} (${percent}%)`,
    ready: (version) => `Version ${version} is ready to install`,
    restart: "Restart to update",
    check: "Check for updates",
    failed: "Update check failed",
    portable: "The portable build cannot update itself",
    development: "Development mode: updates are off",
    openReleases: "Open download page",
  },
  errors: {
    INVALID_URL: {
      title: "Invalid link",
      hint: "Enter a series page link, e.g. https://arenascan.com/manga/<series-name>/",
    },
    UNSUPPORTED_SITE: {
      title: "This site is not supported yet",
      hint: "See the list of working sites on the “Supported sites” page.",
    },
    NETWORK: {
      title: "Could not connect",
      hint: "Check your internet connection and download again. All automatic retries were used.",
    },
    HTTP_STATUS: {
      title: "The site answered with an error",
      hint: "The site may be down or rate limiting. Raise the delay and download again.",
    },
    BLOCKED: {
      title: "Blocked by the site",
      hint: "The site refused the request (Cloudflare or 403). Wait a while, raise the delay, then try again.",
    },
    NOT_FOUND: {
      title: "Page not found (404)",
      hint: "The series or chapter may have been removed or moved. Fetch the series again.",
    },
    PARSE_FAILED: {
      title: "Could not read the page layout",
      hint: "The site probably changed its layout. Its module needs an update.",
    },
    CHAPTER_LIST_EMPTY: {
      title: "No chapters found",
      hint: "The series has no chapters yet, or the site changed its chapter list.",
    },
    CHAPTER_NO_IMAGES: {
      title: "This chapter has no images",
      hint: "The chapter may be locked, need a login, or have no images uploaded yet.",
    },
    CHAPTER_MISMATCH: {
      title: "The site sent a different chapter",
      hint: "This chapter link leads to another chapter, so nothing was saved to avoid mixing files.",
    },
    IMAGE_CORRUPT: {
      title: "The file is not an image",
      hint: "The image server sent bad data. Download the incomplete chapters again.",
    },
    UNSAFE_URL: {
      title: "The link points to an unsafe address",
      hint: "The page sent a link into this computer or the local network, so it was not opened. If every chapter does this, the site may have a problem.",
    },
    RESPONSE_TOO_LARGE: {
      title: "The response is too large",
      hint: "The server sent an unusually large file. The download was stopped to protect memory.",
    },
    FILE_SYSTEM: {
      title: "Could not write the file",
      hint: "Check folder permissions and free space, or whether another program has the file open.",
    },
    INVALID_INPUT: {
      title: "Invalid input",
      hint: "Check the values you entered and try again.",
    },
    BUSY: {
      title: "A download is running",
      hint: "Wait for the current job to finish, or cancel it first.",
    },
    CANCELLED: {
      title: "Cancelled",
      hint: "Images already downloaded are kept. Download again to continue from there.",
    },
    UNKNOWN: {
      title: "Unknown error",
      hint: "See the log file for details.",
    },
  },
};
