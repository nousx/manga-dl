import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Verify the opaque UI token pairs without a browser or network dependency.
const css = await readFile(new URL("../src/renderer/src/styles.css", import.meta.url), "utf8");
const luminance = ([lightness, chroma, hue]) => {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
for (const [index, block] of [...css.matchAll(/:root\s*\{([^}]+)\}/g)].entries()) {
  const tokens = Object.fromEntries([...block[1].matchAll(/--([\w-]+):\s*oklch\(([^)]+)\)/g)]
    .map((match) => [match[1], luminance(match[2].trim().split(/\s+/).map(Number))]));
  const pairs = [
    ...["text", "muted", "accent", "ok", "warn", "bad"].flatMap((foreground) =>
      ["bg", "panel", "panel-2", "selected"].map((background) => [foreground, background, 4.5])),
    ["on-accent", "accent", 4.5], ["control-border", "bg", 3], ["control-border", "panel", 3],
  ];
  const ratios = pairs.map(([foreground, background, minimum]) => {
    const first = tokens[foreground];
    const second = tokens[background];
    const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    assert(ratio >= minimum, `${index ? "dark" : "light"} ${foreground}/${background}: ${ratio.toFixed(2)} < ${minimum}`);
    return ratio;
  });
  console.log(`${index ? "Dark" : "Light"}: ${pairs.length} token pairs pass (text >= 4.5:1, control borders >= 3:1); minimum ${Math.min(...ratios).toFixed(2)}:1`);
}
