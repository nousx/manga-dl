import { useEffect, useState } from "react";
import type {
  HistoryResult,
  SerializedError,
  SiteInfo,
} from "../../../shared/api";
import { ErrorBanner } from "./ErrorBanner";

interface HistoryPageProps {
  outDir: string;
  running: boolean;
  sites: SiteInfo[];
  onLoad: (url: string) => void;
}

const STATUS = { done: "ครบ", incomplete: "ไม่ครบ", failed: "ล้มเหลว" };
const REASON = {
  missing: "ไม่พบไฟล์",
  unreadable: "อ่านไม่ได้",
  malformed: "ข้อมูลไม่ถูกต้อง",
  unsafe: "ข้ามลิงก์ไปยังไฟล์หรือโฟลเดอร์อื่น",
};

export const HistoryPage = ({
  outDir,
  running,
  sites,
  onLoad,
}: HistoryPageProps) => {
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
          <h2>เรื่องที่บันทึกไว้</h2>
          <p className="muted">
            อ่านจากประวัติในโฟลเดอร์ที่เลือก เก็บไว้แม้ปิดโปรแกรม
          </p>
        </div>
        <button
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
        >
          {loading ? "กำลังอ่าน…" : "รีเฟรช"}
        </button>
      </div>
      <div className="folder-line">
        <span>โฟลเดอร์ปัจจุบัน</span>
        <code>{outDir}</code>
      </div>
      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
      {loading && !history && (
        <p className="empty" role="status">
          กำลังอ่านประวัติจากเครื่อง…
        </p>
      )}
      {history && history.issues.length > 0 && (
        <details className="notice">
          <summary>
            อ่านไม่ได้ {history.issues.length} รายการ ตรวจสอบไฟล์หรือสิทธิ์
            แล้วกดรีเฟรช
          </summary>
          <ul>
            {history.issues.map((issue, index) => (
              <li key={index}>
                <code>{issue.location}</code>: {REASON[issue.reason]}
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
          <h2>เริ่มสะสมเรื่องแรก</h2>
          <p>
            เมื่อดาวน์โหลดตอน ประวัติจะรวมไว้ตามเรื่องที่นี่
            <br />
            ดูตอนที่ครบ ตอนที่ต้องลองใหม่ และเปิดโฟลเดอร์ได้ทันที
          </p>
          <button className="primary" onClick={() => onLoad("")}>
            ไปหน้าดาวน์โหลด
          </button>
        </div>
      )}
      {history && history.series.length > 0 && (
        <p className="list-caption">
          {history.series.length} เรื่อง · เรียงตามการอัปเดตล่าสุด
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
                · {series.pages}/{series.totalPages} รูป
              </span>
            </div>
            <div className="history-counts">
              <span className="success">ครบ {series.complete}</span>
              <span>ไม่ครบ {series.incomplete}</span>
              <span className={series.failed ? "failure" : ""}>
                ล้มเหลว {series.failed}
              </span>
            </div>
            <time className="muted" dateTime={series.updatedAt}>
              {new Date(series.updatedAt).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </summary>
          <div className="history-actions">
            <button onClick={() => void open(series.id)}>
              เปิดโฟลเดอร์เรื่อง
            </button>
            <button disabled={running} onClick={() => onLoad(series.url)}>
              โหลดเรื่องนี้ต่อ
            </button>
            {running && (
              <span className="muted">รอให้งานปัจจุบันจบก่อนเปลี่ยนเรื่อง</span>
            )}
          </div>
          <ul className="history-chapters">
            {series.chapters.map((chapter) => (
              <li className={`status-${chapter.status}`} key={chapter.id}>
                <span>{chapter.label}</span>
                <span className="muted">
                  {chapter.pages}/{chapter.totalPages} รูป
                </span>
                <span className="badge">{STATUS[chapter.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
};
