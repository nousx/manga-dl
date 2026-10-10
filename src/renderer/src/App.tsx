import { useEffect, useState } from "react";
import type { FolderTarget, SerializedError, SiteInfo } from "../../shared/api";
import mark from "../../../resources/mark.svg";
import { HistoryPage } from "./components/HistoryPage";
import { SitesPage } from "./components/SitesPage";
import { ChapterList } from "./components/ChapterList";
import { ErrorBanner } from "./components/ErrorBanner";
import { LogPanel } from "./components/LogPanel";
import { SeriesHeader } from "./components/SeriesHeader";
import { SettingsBar } from "./components/SettingsBar";
import { SummaryCard } from "./components/SummaryCard";
import { UpdateStatus } from "./components/UpdateStatus";
import { UrlBar } from "./components/UrlBar";
import { I18nContext } from "./i18n/context";
import { useDownloader } from "./useDownloader";
import { useUpdater } from "./useUpdater";

export const App = () => {
  const downloader = useDownloader();
  const updater = useUpdater();
  const [page, setPage] = useState<"download" | "history" | "sites">(
    "download",
  );
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [shellError, setShellError] = useState<SerializedError | null>(null);
  const [url, setUrl] = useState("");
  const { series, settings, running, loading, summary, error } = downloader;
  const m = downloader.messages;
  const language = settings?.language;

  useEffect(() => {
    void window.api.listSites().then((result) => {
      if (result.ok) setSites(result.data);
      else setShellError(result.error);
    });
  }, []);
  // the lang attribute picks the right glyphs for characters shared by zh, ja and ko
  useEffect(() => {
    if (language) document.documentElement.lang = language;
  }, [language]);

  const load = (value: string): void => {
    setPage("download");
    if (!value) return;
    setUrl(value);
    void downloader.fetchSeries(value);
  };

  const openFolder = (target: FolderTarget): void => {
    void window.api.openFolder(target).then((result) => {
      if (!result.ok) setShellError(result.error);
    });
  };

  return (
    <I18nContext.Provider value={m}>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <img src={mark} alt="" />
            <strong>manga-dl</strong>
          </div>
          <nav aria-label={m.nav.label}>
            <button
              aria-current={page === "download" ? "page" : undefined}
              onClick={() => setPage("download")}
            >
              <span aria-hidden="true">↓</span>
              {m.nav.download}
            </button>
            <button
              aria-current={page === "history" ? "page" : undefined}
              onClick={() => setPage("history")}
            >
              <span aria-hidden="true">▤</span>
              {m.nav.history}
            </button>
            <button
              aria-current={page === "sites" ? "page" : undefined}
              onClick={() => setPage("sites")}
            >
              <span aria-hidden="true">◎</span>
              {m.nav.sites}
            </button>
          </nav>
          <div className="sidebar-job" role="status">
            {running ? (
              <>
                <strong>↓ {m.sidebar.downloading}</strong>
                <span>{series?.title}</span>
                <span>
                  {m.sidebar.chapters(
                    downloader.job?.finished ?? 0,
                    downloader.job?.total ?? downloader.selected.size,
                  )}
                </span>
                <button onClick={() => setPage("download")}>
                  {m.sidebar.viewProgress}
                </button>
              </>
            ) : (
              <>
                <span>{m.sidebar.ready}</span>
                <small>{m.sidebar.readyHint}</small>
              </>
            )}
          </div>
          <div className="sidebar-footer">
            <div className="version">
              manga-dl <span>{updater.state?.currentVersion}</span>
            </div>
            {updater.state && (
              <UpdateStatus
                state={updater.state}
                onCheck={() => void updater.check()}
                onInstall={() => void updater.install()}
                onOpenReleases={() => void updater.openReleasePage()}
              />
            )}
          </div>
        </aside>
        <main className="workspace">
          <header className="page-heading">
            <h1>{m.pageTitle[page]}</h1>
            {running && <span className="muted">{m.working}</span>}
          </header>
          {shellError && (
            <ErrorBanner
              error={shellError}
              onDismiss={() => setShellError(null)}
            />
          )}
          {updater.error && (
            <ErrorBanner
              error={updater.error}
              onDismiss={updater.dismissError}
            />
          )}
          {error && (
            <ErrorBanner error={error} onDismiss={downloader.dismissError} />
          )}
          {settings && (
            <details className="settings-disclosure">
              <summary>
                {m.settings.summary}{" "}
                <span className="muted">
                  ·{" "}
                  {m.settings.summaryDetail(
                    settings.imageConcurrency,
                    settings.requestDelayMs,
                  )}
                </span>
              </summary>
              <SettingsBar
                settings={settings}
                disabled={running || loading}
                onPickFolder={() => void downloader.pickOutputFolder()}
                onOpenFolder={() => openFolder("output")}
                onChange={(patch) => void downloader.updateSettings(patch)}
              />
            </details>
          )}
          {page === "history" && settings && (
            <HistoryPage
              outDir={settings.outDir}
              running={running || loading}
              sites={sites}
              onLoad={load}
            />
          )}
          {page === "sites" && (
            <SitesPage
              sites={sites}
              running={running || loading}
              onLoad={load}
            />
          )}
          <div className="download-page" hidden={page !== "download"}>
            <header className="top">
              <UrlBar
                url={url}
                onChange={setUrl}
                loading={loading}
                disabled={running}
                onSubmit={(value) => void downloader.fetchSeries(value)}
              />
            </header>

            <div className="body">
              <section
                className="panel chapters"
                inert={loading}
                aria-busy={loading}
              >
                {series ? (
                  <>
                    <SeriesHeader
                      series={series}
                      selectedCount={downloader.selected.size}
                      running={running}
                      job={downloader.job}
                      progress={downloader.progress}
                      onSelect={downloader.setSelected}
                      onStart={() => void downloader.start()}
                      onCancel={() => void downloader.cancel()}
                      onOpenFolder={() => openFolder("series")}
                    />
                    {summary && (
                      <SummaryCard
                        summary={summary}
                        disabled={running}
                        onSelectFailures={() =>
                          downloader.setSelected(
                            summary.failures.map(
                              (failure) => failure.chapterId,
                            ),
                          )
                        }
                      />
                    )}
                    <ChapterList
                      chapters={series.chapters}
                      selected={downloader.selected}
                      progress={downloader.progress}
                      disabled={running}
                      onToggle={downloader.toggle}
                    />
                  </>
                ) : (
                  <div className="empty-state">
                    <img src={mark} alt="" />
                    <h2>{m.empty.title}</h2>
                    <p>
                      {m.empty.line1}
                      <br />
                      {m.empty.line2}
                    </p>
                    <button onClick={() => setPage("sites")}>
                      {m.empty.viewSites}
                    </button>
                  </div>
                )}
              </section>

              <LogPanel
                log={downloader.log}
                onClear={downloader.clearLog}
                onOpenLogs={() => openFolder("logs")}
              />
            </div>
          </div>
        </main>
      </div>
    </I18nContext.Provider>
  );
};
