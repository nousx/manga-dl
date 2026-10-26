# Site adapter delivery report, 2026-10-27

Diva Scans and Comix were added to the existing registry. The latest Diva Scans failure in chapters 6–8 is fixed. No download-engine or Node HTTP behavior was changed, and no project dependency was added.

## Diva Scans fix

The source retains `isEncrypted` and `hasStrips` page metadata while explicitly disabling all rendering protection. The original full image URLs remain public WebP files. The parser now accepts these original URLs only when `isProtected`, `useCanvasRendering`, `useTileEncryption`, `useFragmentProtection`, and `useImageScramble` are explicitly false. Redacted, locked, or actively protected pages remain rejected.

A real original image decoded at 800 × 3120. Its left strip decoded at 266 × 3120; their mean RGB difference was 0.7724, consistent with separate lossy WebP encoding of the same image region.

## Live verification

- Diva Scans chapter 1: 81/81 images, through the built app UI; history verified and navigation tested during the job.
- Diva Scans chapter 6: 83/83 images.
- Diva Scans chapter 7: 79/79 images.
- Diva Scans chapter 8: 86/86 images.
- Chapters 6–8: `requested: 3, done: 3, skipped: 0, incomplete: 0, failed: 0, cancelled: false`; 248 physical image files verified against the manifest, with 3 complete chapters in history.
- Comix: 8 distinct chapter numbers from 11 translation entries; the most complete group is preferred, with other groups filling missing numbers to avoid folder collisions.
- Comix chapter 1: 154/154 images, `requested: 1, done: 1, incomplete: 0, failed: 0`.
- Downloads were confined to temporary test folders. The owner's output directory and saved settings were not modified by the verification scripts.
- The built app was reopened at the user's request. The Diva Scans series is loaded with chapters 6–8 selected. No download was started in the owner's output folder. Old failure statuses on disk will update when the user retries those chapters.

## Required commands, exact final output

### `npx tsc --noEmit`

Exit code: 0.

No stdout or stderr output.

### `npx vitest run`

Exit code: 0.

```text

 RUN  v5.0.3 C:/Users/SpecTruM/Desktop/Working/manga-dl


 Test Files  9 passed (9)
      Tests  265 passed (265)
   Start at  00:24:28
   Duration  689ms (import 40%, transform 39%, tests 20%, worker 1%)

```

### `npx electron-vite build`

Exit code: 0.

```text
vite v7.3.7 building ssr environment for production...
transforming...
✓ 21 modules transformed.
rendering chunks...
out/main/index.js  71.73 kB
✓ built in 256ms
vite v7.3.7 building ssr environment for production...
transforming...
✓ 2 modules transformed.
rendering chunks...
out/preload/index.cjs  2.35 kB
✓ built in 16ms
vite v7.3.7 building client environment for production...
transforming...
✓ 52 modules transformed.
rendering chunks...
../../out/renderer/index.html                   0.57 kB
../../out/renderer/assets/index-CEDHgRAc.css   15.25 kB
../../out/renderer/assets/index-Cg_7YTgK.js   743.04 kB
✓ built in 643ms
```

## Source files

Added:

- `src/sites/divascans.ts`
- `src/sites/comix.ts`
- `src/main/comix-browser.ts`
- `tests/divascans.test.ts`
- `tests/comix.test.ts`
- `tests/fixtures/divascans-series.html`
- `tests/fixtures/divascans-chapter.html`
- `tests/fixtures/divascans-chapter-6.html`
- `tests/fixtures/divascans-chapter-7.html`
- `tests/fixtures/divascans-chapter-8.html`
- `tests/fixtures/comix-series.html`
- `tests/fixtures/comix-chapter.html`
- `docs/site-adapters-report-2026-10-27.md`

Changed:

- `src/sites/index.ts`, registers both adapters and drives the supported-sites page automatically.
- `src/main/index.ts`, supplies the Comix browser transport and closes auxiliary readers on app exit.

Removed: no pre-existing project files.

Build output regenerated under `out/`: `main/index.js`, `preload/index.cjs`, `renderer/index.html`, `renderer/assets/index-CEDHgRAc.css`, and `renderer/assets/index-Cg_7YTgK.js`.

Diagnostic scripts, downloaded source snapshots, isolated browser profiles, generated bundles and verification result JSON are retained under `.verification/`. They are development artifacts and are not included in the packaged app. Temporary download folders are recorded in `.verification/divascans-run.json`, `.verification/divascans-retry-result.json` and `.verification/comix-live-result.json`.

## Screenshots

- `docs/screenshots/divascans-download-light.png`
- `docs/screenshots/divascans-download-dark.png`
- `docs/screenshots/divascans-history-light.png`
- `docs/screenshots/divascans-history-dark.png`
- `docs/screenshots/divascans-sites-light.png`
- `docs/screenshots/divascans-sites-dark.png`
- `docs/screenshots/divascans-fixed-chapters-6-8.png`

These were captured from the built Electron app. The icon in navigation is visible; native taskbar appearance was not re-verified as part of these site changes.

## Limits and behavior

Diva Scans locked content is not downloaded. Comix uses a separate sandboxed Electron reader with no preload, Node integration, downloads, or application IPC access. Its reader is briefly displayed without taking keyboard focus because hidden readers pause image loading. Canvas or protected image formats are rejected rather than saved as incomplete or scrambled images. Both sites may change their HTML or require browser verification in the future.
