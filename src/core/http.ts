import { AppError } from "./errors";
import { assertPublicUrl, type HostResolver } from "./net";
import type { Http, TextResponse } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_REDIRECTS = 5;
const MAX_TEXT_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_BYTES = 64 * 1024 * 1024;

export interface RetryInfo {
  url: string;
  attempt: number;
  maxAttempts: number;
  reason: string;
  waitMs: number;
}

export interface HttpClientOptions {
  /** Minimum gap between the start of two requests. */
  minDelayMs: number;
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onRetry?: (info: RetryInfo) => void;
  /** Replaces the DNS lookup behind the private-network guard (tests). */
  resolveHost?: HostResolver;
}

const cancelled = (): AppError =>
  new AppError("CANCELLED", "Cancelled by user");

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelled());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(cancelled());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const statusError = (response: Response, url: string): AppError => {
  const { status } = response;
  const details = { url, status };
  if (status === 404 || status === 410)
    return new AppError("NOT_FOUND", `HTTP ${status} for ${url}`, details);
  if (status === 403 || response.headers.get("cf-mitigated") !== null) {
    return new AppError(
      "BLOCKED",
      `Blocked by the site (HTTP ${status}) for ${url}`,
      details,
    );
  }
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  return new AppError("HTTP_STATUS", `HTTP ${status} for ${url}`, {
    ...details,
    retryAfterMs: Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : 0,
  });
};

/** Reads a body in chunks and stops as soon as it passes the limit. */
const readLimited = async (
  response: Response,
  limit: number,
  url: string,
): Promise<Buffer> => {
  const tooLarge = (): AppError =>
    new AppError(
      "RESPONSE_TOO_LARGE",
      `Response is larger than ${limit} bytes for ${url}`,
      { url, limit },
    );
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw tooLarge();
  }
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
};

const isRetryable = (error: AppError): boolean => {
  if (error.code === "NETWORK") return true;
  if (error.code !== "HTTP_STATUS") return false;
  const status = Number(error.details.status);
  return status === 429 || status >= 500;
};

const retryDelay = (error: AppError, attempt: number): number => {
  const backoff = 1000 * 2 ** (attempt - 1);
  const retryAfter = Number(error.details.retryAfterMs ?? 0);
  return Math.min(Math.max(backoff, retryAfter), MAX_RETRY_AFTER_MS);
};

export class HttpClient implements Http {
  private readonly minDelayMs: number;
  private readonly retries: number;
  private readonly timeoutMs: number;
  private readonly signal?: AbortSignal;
  private readonly onRetry?: (info: RetryInfo) => void;
  private readonly resolveHost?: HostResolver;
  private nextSlot = 0;

  constructor(options: HttpClientOptions) {
    this.minDelayMs = options.minDelayMs;
    this.retries = options.retries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.signal = options.signal;
    this.onRetry = options.onRetry;
    this.resolveHost = options.resolveHost;
  }

  getText(url: string, referer?: string): Promise<TextResponse> {
    return this.request(url, referer, async (response, finalUrl) => ({
      text: (await readLimited(response, MAX_TEXT_BYTES, finalUrl)).toString(
        "utf8",
      ),
      finalUrl,
    }));
  }

  getBytes(url: string, referer?: string): Promise<Buffer> {
    return this.request(url, referer, async (response) => {
      const bytes = await readLimited(response, MAX_IMAGE_BYTES, url);
      const declared = response.headers.get("content-length");
      // content-length describes the encoded body, so it only compares when nothing was decoded
      const comparable =
        declared !== null && response.headers.get("content-encoding") === null;
      if (comparable && Number(declared) !== bytes.length) {
        throw new AppError(
          "NETWORK",
          `Truncated body: got ${bytes.length} of ${declared} bytes for ${url}`,
          { url },
        );
      }
      return bytes;
    });
  }

  private async waitTurn(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.nextSlot);
    this.nextSlot = slot + this.minDelayMs;
    await sleep(slot - now, this.signal);
  }

  private classify(error: unknown, url: string): AppError {
    if (error instanceof AppError) return error;
    if (this.signal?.aborted) return cancelled();
    if (error instanceof Error && error.name === "TimeoutError") {
      return new AppError(
        "NETWORK",
        `Timed out after ${this.timeoutMs} ms for ${url}`,
        { url },
        error,
      );
    }
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? `: ${error.cause.message}`
        : "";
    const message = error instanceof Error ? error.message : String(error);
    return new AppError(
      "NETWORK",
      `${message}${cause} (${url})`,
      { url },
      error,
    );
  }

  private async attempt<T>(
    url: string,
    referer: string | undefined,
    read: (response: Response, finalUrl: string) => Promise<T>,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = this.signal
      ? AbortSignal.any([this.signal, timeout])
      : timeout;
    const headers: Record<string, string> = {
      "user-agent": USER_AGENT,
      accept: "*/*",
    };
    if (referer) headers.referer = referer;
    // redirects are followed by hand so every hop passes the same guard
    let current = url;
    for (let hop = 0; ; hop += 1) {
      await assertPublicUrl(current, this.resolveHost);
      const response = await fetch(current, {
        headers,
        signal,
        redirect: "manual",
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        if (hop >= MAX_REDIRECTS) {
          throw new AppError("HTTP_STATUS", `Too many redirects for ${url}`, {
            url,
            status: response.status,
          });
        }
        current = new URL(location, current).toString();
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw statusError(response, current);
      }
      return read(response, current);
    }
  }

  private async request<T>(
    url: string,
    referer: string | undefined,
    read: (response: Response, finalUrl: string) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = this.retries + 1;
    for (let attempt = 1; ; attempt += 1) {
      try {
        await this.waitTurn();
        return await this.attempt(url, referer, read);
      } catch (cause) {
        const error = this.classify(cause, url);
        if (!isRetryable(error) || attempt >= maxAttempts) throw error;
        const waitMs = retryDelay(error, attempt);
        this.onRetry?.({
          url,
          attempt,
          maxAttempts,
          reason: error.message,
          waitMs,
        });
        await sleep(waitMs, this.signal);
      }
    }
  }
}
