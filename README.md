# manga-dl

Desktop app that saves the chapters of a series as ordered image folders, ready for a translation pipeline. Each website is a separate module, so new sites can be added without touching the core.

![Download page](docs/screenshots/10-download-scrolled-light.png)

## Features

- Paste a series link, pick chapters, download
- Resume: intact pages and finished chapters are skipped
- Every problem is reported with a typed error code and a hint; full JSONL logs per job
- History page grouped by series, read from the output folder
- Supported sites page
- Interface in Thai, English, Simplified Chinese, Korean and Japanese
- Updates itself from GitHub releases (installed version)
- Light and dark themes

## Download

Grab the latest `setup` or `portable` exe from [Releases](../../releases), or from the artifacts of the latest [Build](../../actions/workflows/build.yml) run.

The exe is not code signed, so Windows SmartScreen will warn on first launch.

The installed version checks for a new release on start and every six hours, downloads it in the background, and installs it when you restart. The portable exe cannot replace itself; it links to the download page instead.

## Development

Requires Node.js 24.

```sh
npm install
npm run dev        # run with hot reload
npm start          # build, then run
npm test           # unit tests
npm run typecheck
npm run dist       # build installer and portable exe into release/
```

## Output layout

```
<output folder>/<site id>/<series title>/Chapter 12/001.jpg
<output folder>/<site id>/<series title>/manifest.json
<output folder>/logs/<timestamp>.jsonl
```

Chapter folders are always named in English, whatever the interface language. They rely on natural sorting (Windows Explorer does this), so `Chapter 2` comes before `Chapter 10`. Folders saved by older versions (`0012`) are renamed the next time that series is downloaded.

## Adding a language

1. Add the code to `LOCALES` and `LOCALE_NAMES` in `src/shared/locale.ts`.
2. Add `src/renderer/src/i18n/<code>.ts` that satisfies the `Messages` type, and register it in `src/renderer/src/i18n/index.ts`. A missing message is a compile error.

## Adding a site

1. Create `src/sites/<name>.ts` that exports a `SiteAdapter` (see `src/core/types.ts`). Sites built on the WordPress MangaReader theme only need a small config for `createMangaReaderAdapter`, like `src/sites/arenascan.ts`.
2. Register it in `src/sites/index.ts`.
3. Add parser tests with a reduced HTML fixture in `tests/fixtures/`.

## Releasing

Set `version` in `package.json`, commit, then push a matching tag such as `v0.2.0`. The Build workflow attaches both exe files, `latest.yml` and the blockmap to a GitHub release. Installed copies pick the new version up from `latest.yml`, so the tag and `version` must match.

## Notice

Download only content you have the right to save. Respect each site's terms of use.
