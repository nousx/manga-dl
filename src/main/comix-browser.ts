import { BrowserWindow, session } from "electron";
import { AppError } from "../core/errors";
import { parsePublicUrl } from "../core/net";
import { sleep } from "../core/http";
import type { Http, TextResponse } from "../core/types";
import { comixPageUrl } from "../sites/comix";

const windows = new Set<BrowserWindow>();
const partition = "manga-dl-comix-reader"; // In-memory; no login or saved browser profile.
let configured = false;

export const closeComixReaders = (): void => {
  for (const window of windows) window.destroy();
  windows.clear();
};

/** The remote site has no preload, IPC bridge, Node access, downloads or permissions. */
const createReader = (): BrowserWindow => {
  const isolated = session.fromPartition(partition);
  if (!configured) {
    configured = true;
    isolated.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    isolated.setPermissionCheckHandler(() => false);
    isolated.on("will-download", (event) => event.preventDefault());
    isolated.webRequest.onBeforeRequest((details, callback) => {
      const publicUrl = parsePublicUrl(details.url);
      const safe =
        publicUrl !== null &&
        (details.resourceType !== "mainFrame" ||
          (publicUrl.hostname === "comix.to" &&
            publicUrl.pathname.startsWith("/title/")));
      callback({ cancel: !safe });
    });
  }
  const window = new BrowserWindow({
    show: false,
    width: 1000,
    height: 900,
    webPreferences: {
      partition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  windows.add(window);
  window.on("closed", () => windows.delete(window));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  return window;
};

export const readComixDocument = async (
  raw: string,
  signal?: AbortSignal,
): Promise<TextResponse> => {
  const url = comixPageUrl(raw);
  if (signal?.aborted) throw new AppError("CANCELLED", "Cancelled");
  const window = createReader();
  const abort = (): void => {
    if (!window.isDestroyed()) window.destroy();
  };
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 180_000);
  const evaluate = <T>(script: string): Promise<T> =>
    window.webContents.executeJavaScript(script) as Promise<T>;
  const wait = async (script: string, milliseconds = 30_000): Promise<void> => {
    const deadline = Date.now() + milliseconds;
    while (Date.now() < deadline) {
      if (await evaluate<boolean>(script)) return;
      await sleep(150, signal);
    }
    throw new AppError(
      "BLOCKED",
      "Comix reader did not become ready; the site may require browser verification",
      { url: raw },
    );
  };
  try {
    await window.loadURL(url.toString());
    const isChapter = /\/\d+-[^/]+\/?$/.test(url.pathname);
    if (!isChapter) {
      const rows: string[] = [];
      let expectedTotal = 0;
      for (let page = 1; page <= 500; page += 1) {
        if (page > 1) {
          url.searchParams.set("page", String(page));
          await window.loadURL(url.toString());
        }
        await wait(
          "document.querySelector('.mchap-item') !== null && document.querySelector('.mchap-list')?.getAttribute('aria-busy') !== 'true'",
        );
        const data = await evaluate<{
          rows: string[];
          total: number;
          first: number;
          last: number;
        }>(`(() => {
          const hint = document.querySelector('.mchap-foot__hint')?.textContent ?? '';
          const match = /Showing\\s+(\\d+)\\s+to\\s+(\\d+)\\s+of\\s+(\\d+)\\s+items/i.exec(hint);
          return {rows:[...document.querySelectorAll('.mchap-item')].map(row => row.outerHTML),
            total:Number(match?.[3] ?? 0), first:Number(match?.[1] ?? 0), last:Number(match?.[2] ?? 0)};
        })()`);
        if (
          !Number.isInteger(data.total) ||
          data.total < 1 ||
          data.total > 10_000 ||
          data.first !== rows.length + 1 ||
          data.last !== rows.length + data.rows.length ||
          (expectedTotal !== 0 && data.total !== expectedTotal)
        ) {
          throw new AppError(
            "PARSE_FAILED",
            "Comix pagination is incomplete or changed during loading",
            { url: raw },
          );
        }
        expectedTotal = data.total;
        rows.push(...data.rows);
        if (rows.length === expectedTotal) break;
      }
      if (rows.length !== expectedTotal)
        throw new AppError("PARSE_FAILED", "Comix chapter limit exceeded");
      const initial = await evaluate<string>(
        "document.querySelector('#initial-data')?.outerHTML ?? ''",
      );
      return {
        text: `${initial}<ul class="mchap-list">${rows.join("")}</ul>`,
        finalUrl: raw,
      };
    }
    await wait("document.querySelector('.rpage-page[data-page]') !== null");
    // Comix pauses its lazy reader when it is not being displayed. Let the site's
    // own reader load the page images, without taking keyboard focus from the app.
    window.showInactive();
    const count = await evaluate<number>(
      "document.querySelectorAll('.rpage-page[data-page]').length",
    );
    if (count < 1 || count > 2_000)
      throw new AppError("PARSE_FAILED", "Invalid Comix page count");
    const images: string[] = [];
    for (let index = 1; index <= count; index += 1) {
      const selector = `.rpage-page[data-page="${index}"]`;
      await evaluate(
        `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',behavior:'instant'})`,
      );
      try {
        await wait(
          `Boolean(document.querySelector(${JSON.stringify(selector)})?.querySelector('img.rpage-page__img[src],canvas'))`,
          15_000,
        );
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new AppError(
          "PARSE_FAILED",
          `Comix reader could not load page ${index} of ${count}`,
          { url: raw },
          error,
        );
      }
      const page = await evaluate<{ html: string; canvas: boolean }>(`(() => {
        const page = document.querySelector(${JSON.stringify(selector)});
        return {html:page.outerHTML,canvas:page.querySelector('canvas') !== null};
      })()`);
      if (page.canvas)
        throw new AppError(
          "PARSE_FAILED",
          "Comix canvas/protected images are not supported",
        );
      images.push(page.html);
    }
    const initial = await evaluate<string>(
      "document.querySelector('#initial-data')?.outerHTML ?? ''",
    );
    return {
      text: `${initial}${images.join("")}`,
      finalUrl: window.webContents.getURL(),
    };
  } catch (error) {
    if (signal?.aborted) throw new AppError("CANCELLED", "Cancelled");
    if (error instanceof AppError) throw error;
    throw new AppError(
      "NETWORK",
      "Comix browser reader failed",
      { url: raw },
      error,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
    if (!window.isDestroyed()) window.destroy();
  }
};

/** Only Comix documents use Chromium. Image bytes still use the guarded Node client. */
export const createComixHttp = (http: Http, signal?: AbortSignal): Http => ({
  getText: (url) => readComixDocument(url, signal),
  getBytes: (url, referer) => http.getBytes(url, referer),
});
