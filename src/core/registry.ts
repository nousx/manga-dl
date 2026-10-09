import { AppError } from "./errors";
import type { SiteAdapter } from "./types";

export interface ResolvedSite {
  adapter: SiteAdapter;
  url: URL;
}

export const resolveSite = (
  adapters: SiteAdapter[],
  input: string,
): ResolvedSite => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch (cause) {
    throw new AppError(
      "INVALID_URL",
      `Not a valid URL: ${input}`,
      { url: input },
      cause,
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AppError(
      "INVALID_URL",
      `Only http(s) URLs are supported: ${input}`,
      { url: input },
    );
  }
  const adapter = adapters.find((candidate) => candidate.matches(url));
  if (!adapter) {
    throw new AppError(
      "UNSUPPORTED_SITE",
      `No site module handles ${url.hostname}`,
      {
        host: url.hostname,
        supported: adapters.map((candidate) => candidate.name),
      },
    );
  }
  return { adapter, url };
};
