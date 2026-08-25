import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Terms of Service | Deaf Shark Coffee",
  description: "The terms that apply when ordering from Deaf Shark Coffee online.",
};

/* PLACEHOLDER CONTENT. See the note in app/privacy/page.tsx: the headings map to
   how the site actually works, but the final wording comes from Deaf Shark. */

export default function TermsPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/terms" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Terms of Service</h1>
          <p>The terms that apply when you order through this site.</p>
        </div>
      </section>

      <section className="legal-body">
        <p className="legal-placeholder-note">
          <strong>PLACEHOLDER.</strong> This page is not final. The sections below outline what
          the terms need to cover.
        </p>

        <article>
          <h2>Ordering</h2>
          <p>
            PLACEHOLDER. Orders placed here are for in-store pickup. State when an order is
            accepted, and that prices and availability can change.
          </p>
        </article>

        <article>
          <h2>Pickup times</h2>
          <p>
            PLACEHOLDER. The site shows an estimated pickup time and offers scheduled pickup.
            State that estimates are not guarantees.
          </p>
        </article>

        <article>
          <h2>Payment</h2>
          <p>
            PLACEHOLDER. Cover paying at the counter, paying online, and the rule that
            scheduled orders are paid in advance.
          </p>
        </article>

        <article>
          <h2>Cancellations and refunds</h2>
          <p>PLACEHOLDER. State how a customer cancels an order and when a refund is given.</p>
        </article>

        <article>
          <h2>Accounts and loyalty points</h2>
          <p>
            PLACEHOLDER. Cover how points are earned and redeemed, whether they expire, that
            they hold no cash value, and what happens to them if an account is closed.
          </p>
        </article>

        <article>
          <h2>Allergens and food safety</h2>
          <p>
            PLACEHOLDER. Menu descriptions are not a complete ingredient list. State how
            customers should raise an allergy before ordering.
          </p>
        </article>

        <article>
          <h2>Acceptable use</h2>
          <p>PLACEHOLDER. Standard terms about misusing the site or placing fraudulent orders.</p>
        </article>

        <article>
          <h2>Contact</h2>
          <p>PLACEHOLDER. Business contact address and email for questions about these terms.</p>
        </article>

        <p className="legal-updated">Last updated: PLACEHOLDER</p>
      </section>

      <SiteFooter />
    </main>
  );
}
