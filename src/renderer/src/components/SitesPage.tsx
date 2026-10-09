import { useState } from "react";
import type { SiteInfo } from "../../../shared/api";

interface SitesPageProps {
  sites: SiteInfo[];
  running: boolean;
  onLoad: (url: string) => void;
}

export const SitesPage = ({ sites, running, onLoad }: SitesPageProps) => {
  const [feedback, setFeedback] = useState("");
  const copy = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("คัดลอกลิงก์แล้ว");
    } catch {
      setFeedback("คัดลอกไม่ได้ เลือกลิงก์ด้านบนแล้วกด Ctrl+C");
    }
  };
  return (
    <section className="page-content sites-page">
      <div className="section-heading">
        <div>
          <h2>เว็บไซต์ที่พร้อมใช้งาน</h2>
          <p className="muted">
            วางลิงก์หน้าเรื่องจากเว็บไซต์เหล่านี้ เพื่อเลือกตอนที่ต้องการ
          </p>
        </div>
        <span className="muted">{sites.length} เว็บไซต์</span>
      </div>
      <div className="site-list">
        {sites.map((site) => (
          <article className="site-row" key={site.id}>
            <div className="site-identity">
              <span className="site-monogram" aria-hidden="true">
                {site.name.charAt(0)}
              </span>
              <div>
                <h3>{site.name}</h3>
                <p>{site.domains.join(" · ")}</p>
              </div>
              <span className="site-ready">✓ รองรับ</span>
            </div>
            <dl>
              <div>
                <dt>เอนจิน</dt>
                <dd>{site.engine}</dd>
              </div>
              <div>
                <dt>ลิงก์ตัวอย่าง</dt>
                <dd>
                  <code className="selectable">{site.exampleUrl}</code>
                </dd>
              </div>
            </dl>
            <div className="site-actions">
              <button
                className="primary"
                disabled={running}
                onClick={() => onLoad(site.exampleUrl)}
              >
                ลองโหลดเรื่องนี้
              </button>
              <button onClick={() => void copy(site.exampleUrl)}>
                คัดลอกลิงก์
              </button>
              {running && (
                <span className="muted">
                  เปลี่ยนเรื่องได้เมื่องานปัจจุบันจบ
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="copy-feedback" role="status">
        {feedback}
      </p>
      <div className="site-note">
        <h3>เพิ่มเว็บไซต์ใหม่ได้</h3>
        <p>
          เพิ่มไฟล์ของเว็บไซต์ใน <code>src/sites/</code> แล้วลงทะเบียนใน{" "}
          <code>src/sites/index.ts</code>
          <br />
          เว็บไซต์ที่ใช้ธีมเดียวกัน ใช้โมดูลอ่านข้อมูลร่วมกันได้
        </p>
      </div>
    </section>
  );
};
