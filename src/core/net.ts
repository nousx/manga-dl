import {
  lookup as dnsLookup,
  type LookupAddress,
  type LookupAllOptions,
} from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { AppError } from "./errors";

/** The part of dns.lookup the guard needs; replaceable in tests. */
export type AllAddressLookup = (
  hostname: string,
  options: LookupAllOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    addresses: LookupAddress[],
  ) => void,
) => void;

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home"];

// Everything that is not a globally routable unicast address:
// loopback, private, link-local, carrier NAT, documentation, benchmarking,
// protocol assignments, multicast and reserved space.
const reserved = new BlockList();
reserved.addSubnet("0.0.0.0", 8, "ipv4");
reserved.addSubnet("10.0.0.0", 8, "ipv4");
reserved.addSubnet("100.64.0.0", 10, "ipv4");
reserved.addSubnet("127.0.0.0", 8, "ipv4");
reserved.addSubnet("169.254.0.0", 16, "ipv4");
reserved.addSubnet("172.16.0.0", 12, "ipv4");
reserved.addSubnet("192.0.0.0", 24, "ipv4");
reserved.addSubnet("192.0.2.0", 24, "ipv4");
reserved.addSubnet("192.88.99.0", 24, "ipv4");
reserved.addSubnet("192.168.0.0", 16, "ipv4");
reserved.addSubnet("198.18.0.0", 15, "ipv4");
reserved.addSubnet("198.51.100.0", 24, "ipv4");
reserved.addSubnet("203.0.113.0", 24, "ipv4");
reserved.addSubnet("224.0.0.0", 3, "ipv4");
reserved.addSubnet("::", 96, "ipv6");
reserved.addSubnet("64:ff9b:1::", 48, "ipv6");
reserved.addSubnet("100::", 64, "ipv6");
reserved.addSubnet("2001::", 23, "ipv6");
reserved.addSubnet("2001:db8::", 32, "ipv6");
reserved.addSubnet("3fff::", 20, "ipv6");
reserved.addSubnet("fc00::", 7, "ipv6");
reserved.addSubnet("fe80::", 10, "ipv6");
reserved.addSubnet("fec0::", 10, "ipv6");
reserved.addSubnet("ff00::", 8, "ipv6");

/** Expands an IPv6 address into its eight 16-bit words. */
const ipv6Words = (address: string): number[] | null => {
  let text = address;
  const dotted = /^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(2).map(Number);
    if (a === undefined || b === undefined) return null;
    if (c === undefined || d === undefined) return null;
    text = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string | undefined): number[] =>
    part ? part.split(":").map((word) => Number.parseInt(word, 16)) : [];
  const left = parse(halves[0]);
  const right = parse(halves[1]);
  const gap = 8 - left.length - right.length;
  if (halves.length === 1 ? gap !== 0 : gap < 0) return null;
  const words = [...left, ...new Array<number>(gap).fill(0), ...right];
  return words.every((word) => word >= 0 && word <= 0xffff) ? words : null;
};

const dottedQuad = (high: number, low: number): string =>
  `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

/** IPv4 address carried inside an IPv6 one (mapped, NAT64, 6to4), if any. */
const embeddedIpv4 = (words: number[]): string | null => {
  const [w0, w1, w2, w3, w4, w5, w6, w7] = words;
  if (w1 === undefined || w2 === undefined) return null;
  if (w6 === undefined || w7 === undefined) return null;
  const zeroMiddle = w2 === 0 && w3 === 0 && w4 === 0;
  if (w0 === 0 && w1 === 0 && zeroMiddle && w5 === 0xffff)
    return dottedQuad(w6, w7);
  if (w0 === 0x64 && w1 === 0xff9b && zeroMiddle && w5 === 0)
    return dottedQuad(w6, w7);
  if (w0 === 0x2002) return dottedQuad(w1, w2);
  return null;
};

export const isPublicAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) return !reserved.check(address, "ipv4");
  if (family !== 6) return false;
  const bare = address.split("%")[0] ?? "";
  const words = ipv6Words(bare);
  if (!words) return false;
  const inner = embeddedIpv4(words);
  // a tunnelled or translated address is only as public as the IPv4 inside it
  if (inner !== null) return isPublicAddress(inner);
  return !reserved.check(bare, "ipv6");
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

export const unsafeUrl = (target: string, reason: string): AppError =>
  new AppError("UNSAFE_URL", `Refusing to request ${target}: ${reason}`, {
    url: target,
    reason,
  });

/**
 * DNS lookup for the socket itself. The address that gets checked is the
 * address that gets connected to, so a host cannot answer "public" for a
 * check and "private" for the connection (DNS rebinding).
 */
export const createGuardedLookup =
  (lookup: AllAddressLookup = dnsLookup): LookupFunction =>
  (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) {
        callback(error, []);
        return;
      }
      const first = addresses[0];
      const safe = addresses.every((entry) => isPublicAddress(entry.address));
      if (first === undefined || !safe) {
        callback(
          unsafeUrl(hostname, "host resolves to a private network address"),
          [],
        );
        return;
      }
      if (options.all) callback(null, addresses);
      else callback(null, first.address, first.family);
    });
  };
