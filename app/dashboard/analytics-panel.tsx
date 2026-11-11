"use client";

const CLOUDFLARE_ANALYTICS_URL = "https://dash.cloudflare.com/84c14a9868348f78f6aa9f9c341d60a3/web-analytics";

export function AnalyticsPanel() {
  return (
    <section className="analytics-panel cloudflare-analytics-panel">
      <div className="cloudflare-analytics-card">
        <span className="admin-eyebrow">Website</span>
        <div className="cloudflare-analytics-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M33.6 35.5H10.2a8.2 8.2 0 0 1-.8-16.4A13.4 13.4 0 0 1 35 16.4a9.6 9.6 0 0 1-1.4 19.1Z" fill="#f38020"/><path d="M18.4 35.5h19a6.6 6.6 0 0 0 .6-13.2 10.5 10.5 0 0 0-19.6 5.2 8 8 0 0 0 0 8Z" fill="#faae40"/></svg>
        </div>
        <h1>Cloudflare Web Analytics</h1>
        <p>View your free, privacy-friendly website analytics in Cloudflare. It tracks public page views, visitors, traffic sources, devices, countries, browsers, and real-world page performance.</p>
        <a className="cloudflare-analytics-button" href={CLOUDFLARE_ANALYTICS_URL} target="_blank" rel="noreferrer">
          Open full analytics
          <span aria-hidden="true">↗</span>
        </a>
        <div className="cloudflare-analytics-notes">
          <span><b>✓</b> No analytics data is written to your D1 database</span>
          <span><b>✓</b> No third-party advertising cookies</span>
          <span><b>✓</b> Managed automatically by Cloudflare</span>
        </div>
        <small>You may be asked to sign in to Cloudflare before the report opens.</small>
      </div>
    </section>
  );
}
