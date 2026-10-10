import { useEffect, useState } from "react";
import type {
  HistoryResult,
  SerializedError,
  SiteInfo,
} from "../../../shared/api";
import { useI18n } from "../i18n/context";
import { ErrorBanner } from "./ErrorBanner";

interface HistoryPageProps {
  outDir: string;
  running: boolean;
  sites: SiteInfo[];
  onLoad: (url: string) => void;
}

export const HistoryPage = ({
  outDir,
  running,
  sites,
  onLoad,
}: HistoryPageProps) => {
  const m = useI18n();
  const [history, setHistory] = useState<HistoryResult | null>(null);
  const [error, setError] = useState<SerializedError | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.listHistory().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setHistory(result.data);
        setError(null);
      } else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [outDir, running, refresh]);

  const open = async (id: string): Promise<void> => {
    const result = await window.api.openHistoryFolder(id);
    if (!result.ok) setError(result.error);
  };

  return (
    <section className="page-content history-page" aria-busy={loading}>
      <div className="section-heading">
        <div>
          <h2>{m.history.heading}</h2>
          <p className="muted">{m.history.description}</p>
        </div>
        <button
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
        >
          {loading ? m.history.reading : m.history.refresh}
        </button>
      </div>
      <div className="folder-line">
        <span>{m.history.currentFolder}</span>
        <code>{outDir}</code>
      </div>
      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
      {loading && !history && (
        <p className="empty" role="status">
          {m.history.readingHistory}
        </p>
      )}
      {history && history.issues.length > 0 && (
        <details className="notice">
          <summary>{m.history.issues(history.issues.length)}</summary>
          <ul>
            {history.issues.map((issue, index) => (
              <li key={index}>
                <code>{issue.location}</code>: {m.history.reasons[issue.reason]}
              </li>
            ))}
          </ul>
        </details>
      )}
      {history && history.series.length === 0 && (
        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">
            ▤
          </span>
          <h2>{m.history.emptyTitle}</h2>
          <p>
            {m.history.emptyLine1}
            <br />
            {m.history.emptyLine2}
          </p>
          <button className="primary" onClick={() => onLoad("")}>
            {m.history.goDownload}
          </button>
        </div>
      )}
      {history && history.series.length > 0 && (
        <p className="list-caption">
          {m.history.caption(history.series.length)}
        </p>
      )}
      {history?.series.map((series) => (
        <details className="history-series" key={series.id}>
          <summary>
            <div className="history-title">
              <strong>{series.title}</strong>
              <span className="muted">
                {sites.find((site) => site.id === series.siteId)?.name ??
                  series.siteId}{" "}
                · {m.common.pages(series.pages, series.totalPages)}
              </span>
            </div>
            <div className="history-counts">
              <span className="success">
                {m.history.complete(series.complete)}
              </span>
              <span>{m.history.incomplete(series.incomplete)}</span>
              <span className={series.failed ? "failure" : ""}>
                {m.history.failed(series.failed)}
              </span>
            </div>
            <time className="muted" dateTime={series.updatedAt}>
              {new Date(series.updatedAt).toLocaleString(m.intlLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </summary>
          <div className="history-actions">
            <button onClick={() => void open(series.id)}>
              {m.common.openSeriesFolder}
            </button>
            <button disabled={running} onClick={() => onLoad(series.url)}>
              {m.history.continueSeries}
            </button>
            {running && <span className="muted">{m.history.waitForJob}</span>}
          </div>
          <ul className="history-chapters">
            {series.chapters.map((chapter) => (
              <li className={`status-${chapter.status}`} key={chapter.id}>
                <span>{chapter.label}</span>
                <span className="muted">
                  {m.common.pages(chapter.pages, chapter.totalPages)}
                </span>
                <span className="badge">{m.status[chapter.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
};
