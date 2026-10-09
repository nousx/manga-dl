import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/core/errors";
import { HttpClient } from "../src/core/http";
import {
  assertPublicUrl,
  isPublicAddress,
  parsePublicUrl,
} from "../src/core/net";

const PUBLIC = ["93.184.216.34"];
const publicHost = async (): Promise<string[]> => PUBLIC;

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    return error instanceof AppError ? error.code : "NOT_APP_ERROR";
  }
  return "NO_ERROR";
};

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "not-an-address",
  ])("should return false when the address is %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"])(
    "should return true when the address is %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );
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

describe("assertPublicUrl", () => {
  it("should return the URL when the host resolves to a public address", async () => {
    const url = await assertPublicUrl("https://example.com/a", publicHost);

    expect(url.hostname).toBe("example.com");
  });

  it("should throw UNSAFE_URL when a public name resolves to a private address", async () => {
    const resolve = async (): Promise<string[]> => ["10.0.0.5"];

    const code = await codeOf(() =>
      assertPublicUrl("https://example.com/a", resolve),
    );

    expect(code).toBe("UNSAFE_URL");
  });

  it("should throw UNSAFE_URL when any resolved address is private", async () => {
    const resolve = async (): Promise<string[]> => [...PUBLIC, "127.0.0.1"];

    const code = await codeOf(() =>
      assertPublicUrl("https://example.com/a", resolve),
    );

    expect(code).toBe("UNSAFE_URL");
  });

  it("should throw UNSAFE_URL without a lookup when the host is a private literal", async () => {
    const resolve = vi.fn(publicHost);

    const code = await codeOf(() =>
      assertPublicUrl("http://127.0.0.1:9333/json", resolve),
    );

    expect(code).toBe("UNSAFE_URL");
    expect(resolve).not.toHaveBeenCalled();
  });
});

describe("HttpClient", () => {
  const client = (): HttpClient =>
    new HttpClient({ minDelayMs: 0, retries: 0, resolveHost: publicHost });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should not send a request when the URL points at the local machine", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const code = await codeOf(() => client().getText("http://127.0.0.1/"));

    expect(code).toBe("UNSAFE_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should stop when a redirect points at a private address", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://192.168.1.1/secret" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const code = await codeOf(() => client().getText("https://example.com/"));

    expect(code).toBe("UNSAFE_URL");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should report the final URL when a redirect stays public", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: "/moved/" } }),
      )
      .mockResolvedValueOnce(new Response("hello"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().getText("https://example.com/old/");

    expect(result).toEqual({
      text: "hello",
      finalUrl: "https://example.com/moved/",
    });
  });

  it("should throw HTTP_STATUS when redirects never end", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: "/loop/" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const code = await codeOf(() => client().getText("https://example.com/"));

    expect(code).toBe("HTTP_STATUS");
  });

  it("should throw RESPONSE_TOO_LARGE when the declared size passes the limit", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("x", { headers: { "content-length": "999999999" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const code = await codeOf(() =>
      client().getBytes("https://example.com/a.jpg"),
    );

    expect(code).toBe("RESPONSE_TOO_LARGE");
  });

  it("should throw RESPONSE_TOO_LARGE when the body keeps growing past the limit", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    const endless = new ReadableStream<Uint8Array>({
      pull: (controller) => controller.enqueue(chunk),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(endless)),
    );

    const code = await codeOf(() => client().getText("https://example.com/"));

    expect(code).toBe("RESPONSE_TOO_LARGE");
  });
});
