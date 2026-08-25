import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy | Deaf Shark Coffee",
  description: "How Deaf Shark Coffee handles customer information collected through this website.",
};

/* PLACEHOLDER CONTENT.
   The headings below are the sections a policy needs to cover for this site, and
   each one notes what actually happens in the code so the real text can be
   written accurately. Deaf Shark supplies the final wording; drafting it is not
   part of the build (see the services agreement, sections 5 and 10).

   Google requires a reachable privacy policy URL before an OAuth consent screen
   can be published, so this page needs real text before Google sign-in goes live. */

export default function PrivacyPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/privacy" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>How we handle the information you share when you order from this site.</p>
        </div>
      </section>

      <section className="legal-body">
        <p className="legal-placeholder-note">
          <strong>PLACEHOLDER.</strong> This page is not final. The sections below outline what
          the policy needs to cover, based on what the site actually collects.
        </p>

        <article>
          <h2>Information we collect</h2>
          <p>
            PLACEHOLDER. The site collects the name and mobile number entered at checkout,
            the contents of each order, and job application details submitted through the
            employment form. Customers who create an account also provide an email address,
            and their loyalty points and order history are stored against that account.
          </p>
        </article>

        <article>
          <h2>How we use it</h2>
          <p>
            PLACEHOLDER. Order details are used to prepare and hand over orders. The mobile
            number is used to send one text message when an order is ready for pickup.
            Account details are used to run the loyalty program.
          </p>
        </article>

        <article>
          <h2>Text messages</h2>
          <p>
            PLACEHOLDER. State that one message is sent per order, that message and data
            rates may apply, and how a customer opts out. This section needs to match the
            carrier registration for the business.
          </p>
        </article>

        <article>
          <h2>Who else sees it</h2>
          <p>
            PLACEHOLDER. Name the third-party services involved in running the site,
            including the hosting and database provider, the text messaging provider, the
            email provider, and the payment processor.
          </p>
        </article>

        <article>
          <h2>Sign-in with Google</h2>
          <p>
            PLACEHOLDER. Describe what is received from Google when a customer chooses to
            sign in that way, which is their name and email address.
          </p>
        </article>

        <article>
          <h2>How long we keep it</h2>
          <p>PLACEHOLDER. State the retention period for orders, accounts, and applications.</p>
        </article>

        <article>
          <h2>Your choices</h2>
          <p>
            PLACEHOLDER. Explain how a customer can request a copy of their information,
            correct it, or ask for their account to be deleted.
          </p>
        </article>

        <article>
          <h2>Contact</h2>
          <p>PLACEHOLDER. Business contact address and email for privacy questions.</p>
        </article>

        <p className="legal-updated">Last updated: PLACEHOLDER</p>
      </section>

      <SiteFooter />
    </main>
  );
}
