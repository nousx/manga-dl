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
import { UrlBar } from "./components/UrlBar";
import { useDownloader } from "./useDownloader";

export const App = () => {
  const downloader = useDownloader();
  const [page, setPage] = useState<"download" | "history" | "sites">(
    "download",
  );
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [shellError, setShellError] = useState<SerializedError | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    void window.api.listSites().then((result) => {
      if (result.ok) setSites(result.data);
      else setShellError(result.error);
    });
  }, []);
  const load = (value: string): void => {
    setPage("download");
    if (!value) return;
    setUrl(value);
    void downloader.fetchSeries(value);
  };
  const { series, settings, running, loading, summary, error } = downloader;

  const openFolder = (target: FolderTarget): void => {
    void window.api.openFolder(target).then((result) => {
      if (!result.ok) setShellError(result.error);
    });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src={mark} alt="" />
          <strong>manga-dl</strong>
        </div>
        <nav aria-label="หน้าหลัก">
          <button
            aria-current={page === "download" ? "page" : undefined}
            onClick={() => setPage("download")}
          >
            <span aria-hidden="true">↓</span>ดาวน์โหลด
          </button>
          <button
            aria-current={page === "history" ? "page" : undefined}
            onClick={() => setPage("history")}
          >
            <span aria-hidden="true">▤</span>ประวัติ
          </button>
          <button
            aria-current={page === "sites" ? "page" : undefined}
            onClick={() => setPage("sites")}
          >
            <span aria-hidden="true">◎</span>เว็บที่รองรับ
          </button>
        </nav>
        <div className="sidebar-job" role="status">
          {running ? (
            <>
              <strong>↓ กำลังดาวน์โหลด</strong>
              <span>{series?.title}</span>
              <span>
                {downloader.job?.finished ?? 0}/
                {downloader.job?.total ?? downloader.selected.size} ตอน
              </span>
              <button onClick={() => setPage("download")}>ดูความคืบหน้า</button>
            </>
          ) : (
            <>
              <span>พร้อมใช้งาน</span>
              <small>บันทึกภาพไว้ในเครื่องของคุณ</small>
            </>
          )}
        </div>
        <div className="sidebar-footer">
          manga-dl <span>0.1</span>
        </div>
      </aside>
      <main className="workspace">
        <header className="page-heading">
          <h1>
            {
              {
                download: "ดาวน์โหลด",
                history: "ประวัติการดาวน์โหลด",
                sites: "เว็บที่รองรับ",
              }[page]
            }
          </h1>
          {running && <span className="muted">กำลังทำงาน</span>}
        </header>
        {shellError && (
          <ErrorBanner
            error={shellError}
            onDismiss={() => setShellError(null)}
          />
        )}
        {error && (
          <ErrorBanner error={error} onDismiss={downloader.dismissError} />
        )}
        {settings && (
          <details className="settings-disclosure">
            <summary>
              ตั้งค่าการดาวน์โหลด{" "}
              <span className="muted">
                · {settings.imageConcurrency} รูปพร้อมกัน ·{" "}
                {settings.requestDelayMs} ms
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
          <SitesPage sites={sites} running={running || loading} onLoad={load} />
        )}
        <div className="download-page" hidden={page !== "download"}>
          <header className="top">
            <UrlBar
              url={url}
              onChange={setUrl}
              loading={loading}
              disabled={running}
              onSubmit={(url) => void downloader.fetchSeries(url)}
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
                          summary.failures.map((failure) => failure.chapterId),
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
                  <h2>จากหน้าเว็บ สู่โฟลเดอร์ของคุณ</h2>
                  <p>
                    วางลิงก์หน้าเรื่อง แล้วกด “ดึงข้อมูล”
                    <br />
                    เลือกตอนที่ต้องการ โปรแกรมจะเรียงภาพให้พร้อมใช้งาน
                  </p>
                  <button onClick={() => setPage("sites")}>
                    ดูเว็บที่รองรับ
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
  );
};
