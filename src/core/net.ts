import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { AppError } from "./errors";

/** Resolves a host name to every address it points at. */
export type HostResolver = (host: string) => Promise<string[]>;

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home"];

// loopback, private, link-local, carrier NAT, multicast and reserved ranges
const privateRanges = new BlockList();
privateRanges.addSubnet("0.0.0.0", 8, "ipv4");
privateRanges.addSubnet("10.0.0.0", 8, "ipv4");
privateRanges.addSubnet("100.64.0.0", 10, "ipv4");
privateRanges.addSubnet("127.0.0.0", 8, "ipv4");
privateRanges.addSubnet("169.254.0.0", 16, "ipv4");
privateRanges.addSubnet("172.16.0.0", 12, "ipv4");
privateRanges.addSubnet("192.168.0.0", 16, "ipv4");
privateRanges.addSubnet("224.0.0.0", 3, "ipv4");
privateRanges.addAddress("::", "ipv6");
privateRanges.addAddress("::1", "ipv6");
privateRanges.addSubnet("fc00::", 7, "ipv6");
privateRanges.addSubnet("fe80::", 10, "ipv6");
privateRanges.addSubnet("ff00::", 8, "ipv6");

export const isPublicAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 0) return false;
  return !privateRanges.check(address, family === 6 ? "ipv6" : "ipv4");
};

const hostOf = (url: URL): string => url.hostname.replace(/^\[|\]$/g, "");

/**
 * Parses a link found in a page. Returns null unless it is a plain http(s) URL
 * whose host is not obviously on the local machine or network.
 */
export const parsePublicUrl = (raw: string, base?: string): URL | null => {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username !== "" || url.password !== "") return null;
  const host = hostOf(url).toLowerCase().replace(/\.$/, "");
  if (host === "") return null;
  if (isIP(host) !== 0) return isPublicAddress(host) ? url : null;
  if (host === "localhost") return null;
  if (LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  return url;
};

export const resolveHost: HostResolver = async (host) =>
  (await lookup(host, { all: true })).map((entry) => entry.address);

const unsafe = (url: string, reason: string): AppError =>
  new AppError("UNSAFE_URL", `Refusing to request ${url}: ${reason}`, {
    url,
    reason,
  });

/**
 * Guards every outgoing request: page content is untrusted, so a link must not
 * be able to reach the local machine or the local network.
 */
export const assertPublicUrl = async (
  raw: string,
  resolve: HostResolver = resolveHost,
): Promise<URL> => {
  const url = parsePublicUrl(raw);
  if (!url) throw unsafe(raw, "not a public http(s) address");
  const host = hostOf(url);
  if (isIP(host) !== 0) return url;
  const addresses = await resolve(host);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    throw unsafe(raw, "host resolves to a private network address");
  }
  return url;
};
