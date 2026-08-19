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
          <p><strong>900 Green Lane</strong>Union, NJ 07083</p>
          <a className="primary-button" href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get directions</a>
        </article>
        <article>
          <h2>August Hours</h2>
          <p><strong>5:00 AM – 5:00 PM</strong>7 days a week for the month of August.</p>
          <a className="primary-button" href="/menu">Order pickup</a>
        </article>
        <article>
          <h2>Call</h2>
          <p><strong>(908) 481-8884</strong>Call ahead or ask the shop a question.</p>
          <a className="primary-button" href="tel:+19084818884">Call the shop</a>
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
