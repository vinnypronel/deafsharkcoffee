import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Visit Us | Deaf Shark Coffee",
  description: "Visit Deaf Shark Coffee at 900 Green Lane in Union, New Jersey, get directions, or call the shop.",
};

export default function ContactPage() {
  return (
    <main className="content-page">
      <CustomerHeader active="/contact" />
      <section className="page-hero contact-hero">
        <div><span className="eyebrow">Visit the shop</span><h1>Come see us<br />in Union.</h1><p>Stop in for coffee, breakfast, sandwiches, and bites. Pickup ordering is available through this demo.</p></div>
        <div className="contact-stamp"><img src="/deafshark-logo.png" alt="Deaf Shark Coffee logo" /></div>
      </section>
      <section className="contact-grid">
        <article>
          <h2>Visit</h2>
          <p><strong>900 Green Lane</strong><span>Union, NJ 07083</span></p>
          <a className="primary-button hero-cta-btn" href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">
            <span>Get directions</span>
            <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </a>
        </article>
        <article>
          <h2>August Hours</h2>
          <p><strong>5:00 AM – 5:00 PM</strong><span>7 days a week for the month of August.</span></p>
          <a className="primary-button hero-cta-btn" href="/menu">
            <span>Order pickup</span>
            <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </a>
        </article>
        <article>
          <h2>Call</h2>
          <p><strong>(908) 481-8884</strong><span>Call ahead or ask the shop a question.</span></p>
          <a className="primary-button phone-ring-btn" href="tel:+19084818884">
            <svg className="phone-ring-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Call the shop</span>
          </a>
        </article>
      </section>
      <section className="contact-map-section">
        <div className="contact-map-container">
          <iframe
            title="Deaf Shark Coffee Map Location"
            src="https://maps.google.com/maps?q=Deaf+Shark+Coffee,+900+Green+Lane,+Union,+NJ+07083&t=&z=16&ie=UTF8&iwloc=&output=embed"
            className="visit-map-frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Deaf+Shark+Coffee+900+Green+Lane+Union+NJ+07083"
            target="_blank"
            rel="noopener noreferrer"
            className="map-location-banner"
          >
            <div className="map-banner-logo-wrap">
              <img src="/deafshark-logo.png" alt="Deaf Shark Coffee" className="map-banner-logo" />
            </div>
            <div className="map-banner-info">
              <strong>Deaf Shark Coffee</strong>
              <span>900 Green Lane, Union, NJ 07083</span>
            </div>
            <div className="map-banner-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5 2.5L2 9.5l8 4 4 8 7.5-19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </a>
        </div>
      </section>
      <section className="contact-note"><span className="eyebrow">Good to know</span><h2>Pickup only for now.</h2><p>Delivery platform integrations can be added later. Online orders currently flow directly into the Deaf Shark order dashboard.</p></section>
      <SiteFooter />
    </main>
  );
}
