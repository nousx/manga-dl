import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveHistoryFolder,
  scanHistory,
  summarizeManifest,
} from "../src/core/history";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, readFile: vi.fn(original.readFile) };
});

const manifest = () => ({
  version: 1,
  title: "เรื่องทดสอบ",
  siteId: "example",
  url: "https://example.com/manga/test/",
  updatedAt: "2026-10-09T10:00:00.000Z",
  chapters: {
    one: {
      id: "one",
      label: "ตอนที่ 1",
      number: 1,
      status: "done",
      pages: [{ status: "ok" }, { status: "ok" }],
    },
    two: {
      id: "two",
      label: "ตอนที่ 2",
      number: 2,
      status: "incomplete",
      pages: [{ status: "ok" }, { status: "failed" }],
    },
    three: {
      id: "three",
      label: "ตอนที่ 3",
      number: 3,
      status: "failed",
      pages: [],
    },
  },
});

describe("summarizeManifest", () => {
  it("should return chapter totals when a manifest contains mixed outcomes", () => {
    const input = manifest();

    const result = summarizeManifest(input, "entry");

    expect(result).toMatchObject({
      complete: 1,
      incomplete: 1,
      failed: 1,
      pages: 3,
      totalPages: 4,
    });
  });

  it("should return chapters in numeric order when keys are unordered", () => {
    const input = manifest();
    input.chapters = {
      three: input.chapters.three,
      one: input.chapters.one,
      two: input.chapters.two,
    };

    const result = summarizeManifest(input, "entry");

    expect(result?.chapters.map((chapter) => chapter.number)).toEqual([
      1, 2, 3,
    ]);
  });

  it.each([
    null,
    [],
    { ...manifest(), version: 2 },
    { ...manifest(), updatedAt: "invalid" },
    { ...manifest(), url: "file:///C:/secret" },
    { ...manifest(), chapters: { broken: null } },
    {
      ...manifest(),
      chapters: { one: { ...manifest().chapters.one, pages: [null] } },
    },
    {
      ...manifest(),
      chapters: { one: { ...manifest().chapters.one, status: "unknown" } },
    },
  ])("should return null when manifest data is malformed (%#)", (input) => {
    const result = summarizeManifest(input, "entry");

    expect(result).toBeNull();
  });
});

describe("scanHistory", () => {
  let temporary: string;
  let outDir: string;
  const save = async (
    name: string,
    value: unknown = manifest(),
  ): Promise<string> => {
    const folder = join(outDir, "example", name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "manifest.json"), JSON.stringify(value));
    return folder;
  };

  beforeEach(async () => {
    temporary = await mkdtemp(join(tmpdir(), "manga-history-test-"));
    outDir = join(temporary, "output");
    await mkdir(outDir);
  });
  afterEach(async () => {
    // Only remove the temporary tree created by this test, after checking its root.
    const path = relative(tmpdir(), temporary);
    if (
      isAbsolute(path) ||
      path.startsWith("..") ||
      !path.startsWith("manga-history-test-")
    )
      throw new Error("Unsafe test cleanup");
    await rm(temporary, { recursive: true, force: true });
  });

  it("should return an empty history when the output folder is empty", async () => {
    const result = await scanHistory(outDir);

    expect(result).toEqual({ series: [], issues: [] });
  });

  it("should report a missing root when the output folder does not exist", async () => {
    const result = await scanHistory(join(temporary, "missing"));

    expect(result.issues).toEqual([{ location: ".", reason: "missing" }]);
  });

  it("should return newest series first when several manifests exist", async () => {
    await save("older", { ...manifest(), updatedAt: "2025-01-01T00:00:00Z" });
    await save("newer", { ...manifest(), title: "Newer" });

    const result = await scanHistory(outDir);

    expect(result.series.map((series) => series.title)).toEqual([
      "Newer",
      "เรื่องทดสอบ",
    ]);
  });

  it("should report malformed JSON when another series can still be read", async () => {
    const folder = await save("bad");
    await writeFile(join(folder, "manifest.json"), "{");
    await save("good");

    const result = await scanHistory(outDir);

    expect(result.issues).toEqual([
      { location: "example/bad", reason: "malformed" },
    ]);
    expect(result.series).toHaveLength(1);
  });

  it("should skip a series directory that has no manifest yet without reporting it", async () => {
    await mkdir(join(outDir, "example", "missing"), { recursive: true });

    const result = await scanHistory(outDir);

    expect(result.issues).toEqual([]);
    expect(result.series).toEqual([]);
  });

  it("should report an unreadable manifest when file access is denied", async () => {
    await save("private");
    vi.mocked(readFile).mockRejectedValueOnce(
      Object.assign(new Error("Denied"), { code: "EACCES" }),
    );

    const result = await scanHistory(outDir);

    expect(result.issues).toEqual([
      { location: "example/private", reason: "unreadable" },
    ]);
  });

  it("should skip the logs directory when scanning series", async () => {
    await mkdir(join(outDir, "logs", "not-a-series"), { recursive: true });

    const result = await scanHistory(outDir);

    expect(result.issues).toEqual([]);
  });

  it("should report an unsafe entry when a series is a junction outside the output", async () => {
    const outside = join(temporary, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "manifest.json"), JSON.stringify(manifest()));
    await mkdir(join(outDir, "example"));
    await symlink(outside, join(outDir, "example", "linked"), "junction");

    const result = await scanHistory(outDir);

    expect(result).toEqual({
      series: [],
      issues: [{ location: "example/linked", reason: "unsafe" }],
    });
  });

  it("should report a malformed entry when the manifest site differs from its directory", async () => {
    await save("wrong", { ...manifest(), siteId: "other" });

    const result = await scanHistory(outDir);

    expect(result.issues[0]?.reason).toBe("malformed");
  });

  it("should return a verified directory when opening a scanned id", async () => {
    const folder = await save("good");
    const result = await scanHistory(outDir);

    const resolved = await resolveHistoryFolder(outDir, result.series[0]?.id);

    expect(resolved.toLowerCase()).toBe(folder.toLowerCase());
  });

  it("should reject traversal when the renderer supplies a path instead of an id", async () => {
    const attempt = resolveHistoryFolder(outDir, "../../outside");

    await expect(attempt).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("should reject stale ids when the output folder changes", async () => {
    await save("good");
    const result = await scanHistory(outDir);
    const other = join(temporary, "other");
    await mkdir(other);

    const attempt = resolveHistoryFolder(other, result.series[0]?.id);

    await expect(attempt).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("should leave the manifest unchanged when scanning history", async () => {
    const folder = await save("good");
    const before = await readFile(join(folder, "manifest.json"), "utf8");

    await scanHistory(outDir);

    expect(await readFile(join(folder, "manifest.json"), "utf8")).toBe(before);
  });
});
