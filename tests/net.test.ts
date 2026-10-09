import type { LookupAddress } from "node:dns";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/core/errors";
import { HttpClient, type Fetch } from "../src/core/http";
import {
  createGuardedLookup,
  isPublicAddress,
  parsePublicUrl,
  type AllAddressLookup,
} from "../src/core/net";

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

const answering =
  (...addresses: string[]): AllAddressLookup =>
  (_hostname, _options, callback) =>
    callback(
      null,
      addresses.map((address): LookupAddress => ({
        address,
        family: address.includes(":") ? 6 : 4,
      })),
    );

interface LookupOutcome {
  error: unknown;
  address: unknown;
}

const lookupOnce = (
  lookup: AllAddressLookup,
  all: boolean,
): Promise<LookupOutcome> =>
  new Promise((resolve) => {
    createGuardedLookup(lookup)("example.com", { all }, (error, address) =>
      resolve({ error, address }),
    );
  });

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.0.8",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.7",
    "203.0.113.9",
    "240.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::7f00:1",
    "fe80::1",
    "fe80::1%eth0",
    "fec0::1",
    "fd00::1",
    "ff02::1",
    "2001:db8::1",
    "2001::1",
    "::ffff:127.0.0.1",
    "::ffff:c0a8:101",
    "64:ff9b::7f00:1",
    "64:ff9b::10.0.0.1",
    "64:ff9b:1::1",
    "2002:7f00:1::1",
    "2002:c0a8:101::1",
    "not-an-address",
  ])("should return false when the address is %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each([
    "93.184.216.34",
    "8.8.8.8",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808",
    "2002:808:808::1",
  ])("should return true when the address is %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe("parsePublicUrl", () => {
  it.each([
    "file:///C:/Windows/win.ini",
    "javascript:alert(1)",
    "ftp://example.com/a.jpg",
    "http://localhost:3000/",
    "http://127.0.0.1/admin",
    "http://2130706433/",
    "http://0x7f.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[64:ff9b::7f00:1]/",
    "http://192.168.1.1/",
    "http://router.local/",
    "http://user:pass@example.com/",
    "http://",
  ])("should return null when the link is %s", (link) => {
    expect(parsePublicUrl(link)).toBeNull();
  });

  it("should resolve a relative link against the page when a base is given", () => {
    const url = parsePublicUrl("/a/1.jpg", "https://example.com/chapter/");

    expect(url?.toString()).toBe("https://example.com/a/1.jpg");
  });
});

describe("createGuardedLookup", () => {
  it("should pass the address through when the host resolves to a public address", async () => {
    const result = await lookupOnce(answering("93.184.216.34"), false);

    expect(result).toEqual({ error: null, address: "93.184.216.34" });
  });

  it("should return every address when the caller asks for all of them", async () => {
    const result = await lookupOnce(
      answering("93.184.216.34", "2606:4700:4700::1111"),
      true,
    );

    expect(result.address).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ]);
  });

  it("should fail with UNSAFE_URL when a public name resolves to a private address", async () => {
    const result = await lookupOnce(answering("10.0.0.5"), false);

    expect(result.error).toMatchObject({ code: "UNSAFE_URL" });
  });

  it("should fail with UNSAFE_URL when any resolved address is private", async () => {
    const result = await lookupOnce(
      answering("93.184.216.34", "127.0.0.1"),
      true,
    );

    expect(result.error).toMatchObject({ code: "UNSAFE_URL" });
  });

  it("should fail with UNSAFE_URL when the host resolves to nothing", async () => {
    const result = await lookupOnce(answering(), false);

    expect(result.error).toMatchObject({ code: "UNSAFE_URL" });
  });

  it("should pass the resolver error through when the lookup itself fails", async () => {
    const failure = Object.assign(new Error("not found"), {
      code: "ENOTFOUND",
    });
    const failing: AllAddressLookup = (_hostname, _options, callback) =>
      callback(failure, []);

    const result = await lookupOnce(failing, false);

    expect(result.error).toBe(failure);
  });
});

describe("HttpClient", () => {
  const client = (fetch: Fetch): HttpClient =>
    new HttpClient({ minDelayMs: 0, retries: 0, fetch });

  it("should not send a request when the URL points at the local machine", async () => {
    const fetchMock = vi.fn<Fetch>();

    const code = await codeOf(() =>
      client(fetchMock).getText("http://127.0.0.1/"),
    );

    expect(code).toBe("UNSAFE_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should stop when a redirect points at a private address", async () => {
    const fetchMock = vi.fn<Fetch>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://192.168.1.1/secret" },
        }),
    );

    const code = await codeOf(() =>
      client(fetchMock).getText("https://example.com/"),
    );

    expect(code).toBe("UNSAFE_URL");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should report UNSAFE_URL when the socket lookup rejects the host", async () => {
    const rejection = new AppError("UNSAFE_URL", "private address");
    const fetchMock = vi.fn<Fetch>(async () => {
      throw new TypeError("fetch failed", { cause: rejection });
    });

    const code = await codeOf(() =>
      client(fetchMock).getText("https://example.com/"),
    );

    expect(code).toBe("UNSAFE_URL");
  });

  it("should report the final URL when a redirect stays public", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: "/moved/" } }),
      )
      .mockResolvedValueOnce(new Response("hello"));

    const result = await client(fetchMock).getText("https://example.com/old/");

    expect(result).toEqual({
      text: "hello",
      finalUrl: "https://example.com/moved/",
    });
  });

  it("should throw HTTP_STATUS when redirects never end", async () => {
    const fetchMock = vi.fn<Fetch>(
      async () =>
        new Response(null, { status: 302, headers: { location: "/loop/" } }),
    );

    const code = await codeOf(() =>
      client(fetchMock).getText("https://example.com/"),
    );

    expect(code).toBe("HTTP_STATUS");
  });

  it("should throw RESPONSE_TOO_LARGE when the declared size passes the limit", async () => {
    const fetchMock = vi.fn<Fetch>(
      async () =>
        new Response("x", { headers: { "content-length": "999999999" } }),
    );

    const code = await codeOf(() =>
      client(fetchMock).getBytes("https://example.com/a.jpg"),
    );

    expect(code).toBe("RESPONSE_TOO_LARGE");
  });

  it("should throw RESPONSE_TOO_LARGE when the body keeps growing past the limit", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    const endless = new ReadableStream<Uint8Array>({
      pull: (controller) => controller.enqueue(chunk),
    });
    const fetchMock = vi.fn<Fetch>(async () => new Response(endless));

    const code = await codeOf(() =>
      client(fetchMock).getText("https://example.com/"),
    );

    expect(code).toBe("RESPONSE_TOO_LARGE");
  });
});
