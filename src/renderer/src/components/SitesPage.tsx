import { useState } from "react";
import type { SiteInfo } from "../../../shared/api";
import { useI18n } from "../i18n/context";

interface SitesPageProps {
  sites: SiteInfo[];
  running: boolean;
  onLoad: (url: string) => void;
}

export const SitesPage = ({ sites, running, onLoad }: SitesPageProps) => {
  const m = useI18n();
  // stored as an outcome, not as text, so it follows a language change
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const feedback =
    copied === null ? "" : copied ? m.sites.copied : m.sites.copyFailed;

  return (
    <section className="page-content sites-page">
      <div className="section-heading">
        <div>
          <h2>{m.sites.heading}</h2>
          <p className="muted">{m.sites.description}</p>
        </div>
        <span className="muted">{m.sites.count(sites.length)}</span>
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
              <span className="site-ready">✓ {m.sites.supported}</span>
            </div>
            <dl>
              <div>
                <dt>{m.sites.engine}</dt>
                <dd>{site.engine}</dd>
              </div>
              <div>
                <dt>{m.sites.exampleLink}</dt>
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
                {m.sites.tryExample}
              </button>
              <button onClick={() => void copy(site.exampleUrl)}>
                {m.sites.copyLink}
              </button>
              {running && <span className="muted">{m.sites.waitForJob}</span>}
            </div>
          </article>
        ))}
      </div>
      <p className="copy-feedback" role="status">
        {feedback}
      </p>
      <div className="site-note">
        <h3>{m.sites.addTitle}</h3>
        <p>
          {m.sites.addBefore} <code>src/sites/</code> {m.sites.addBetween}{" "}
          <code>src/sites/index.ts</code> {m.sites.addAfter}
          <br />
          {m.sites.addShared}
        </p>
      </div>
    </section>
  );
};
