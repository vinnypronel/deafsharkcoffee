import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy | Deaf Shark Coffee",
  description: "How Deaf Shark Coffee collects, uses, and protects information provided through this website.",
};

export default function PrivacyPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/privacy" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>How we handle information you provide when you use our website and services.</p>
        </div>
      </section>

      <section className="legal-body">
        <article>
          <h2>About this policy</h2>
          <p>
            This Privacy Policy explains how Deaf Shark Coffee collects, uses, shares, and
            protects information when you visit this website, create an account, contact us,
            join our mailing list, apply for a job, or follow a link to place an online order.
            It applies to information handled through this website. A third-party ordering
            service may apply its own privacy policy when you use its website or checkout.
          </p>
        </article>

        <article>
          <h2>Information we collect</h2>
          <p>Depending on how you use the website, we may collect:</p>
          <ul>
            <li>
              <strong>Account information,</strong> such as your name, email address, optional
              phone number and birthday month and day, login credentials, account identifier,
              account preferences, and records of your acceptance of our Terms and Privacy Policy.
            </li>
            <li>
              <strong>Information from Google sign-in,</strong> such as the name, email
              address, profile information, and identifier Google makes available with your
              permission. We do not receive your Google password.
            </li>
            <li>
              <strong>Messages and subscriptions,</strong> including the name, email address,
              phone number, message, and marketing preferences you submit through contact or
              newsletter forms.
            </li>
            <li>
              <strong>Employment information,</strong> including your contact information,
              availability, work-related answers, résumé, and any other information you
              include with an application.
            </li>
            <li>
              <strong>Website and device information,</strong> such as IP address, browser and
              device type, pages requested, referring page, timestamps, security events, and
              cookie or session information needed to operate and protect the website.
            </li>
            <li>
              <strong>Order-related information,</strong> if an account feature or approved
              integration makes it available to us, such as order items, pickup information,
              order status, and an identifier linking the order to your account.
            </li>
          </ul>
          <p>
            Online ordering and payment are completed through a third-party ordering service.
            This website does not receive or store your full payment card number. The ordering
            service may provide us with limited transaction details needed to prepare, fulfill,
            support, or reconcile an order.
          </p>
        </article>

        <article>
          <h2>How we use information</h2>
          <p>We may use information to:</p>
          <ul>
            <li>Operate, maintain, secure, and improve the website and customer experience.</li>
            <li>Provide account features and authenticate users.</li>
            <li>Respond to questions, requests, and customer-service issues.</li>
            <li>Support and fulfill online pickup orders when order data is available to us.</li>
            <li>Send requested service messages and, with your consent, marketing messages.</li>
            <li>Review employment applications and communicate with applicants.</li>
            <li>Administer loyalty benefits if a loyalty program is offered.</li>
            <li>Detect fraud, spam, abuse, security incidents, and violations of our terms.</li>
            <li>Comply with legal, tax, accounting, and operational obligations.</li>
          </ul>
        </article>

        <article>
          <h2>Cookies and similar technology</h2>
          <p>
            We may use cookies, local storage, and similar technology that are necessary for
            sign-in, security, preferences, cart or session functions, and basic site
            operation. If we later use optional analytics or advertising technology, we will
            provide any notice or choices required by applicable law. You can control cookies
            through your browser, although disabling necessary storage may prevent parts of the
            website from working correctly.
          </p>
        </article>

        <article>
          <h2>When we share information</h2>
          <p>
            We do not sell personal information for money. We may share information with
            vendors that help us provide services, such as website hosting, databases, security
            and bot prevention, authentication, file storage, email delivery, communications,
            analytics if enabled, and online ordering and payment. These providers may process
            information under their own terms and privacy policies.
          </p>
          <p>
            We may also share information when reasonably necessary to comply with law, respond
            to lawful requests, protect customers or the business, investigate fraud or abuse,
            enforce agreements, or complete a merger, financing, sale, or transfer of business
            assets. We do not share employment applications with unrelated parties for their
            own marketing purposes.
          </p>
        </article>

        <article>
          <h2>Email and marketing choices</h2>
          <p>
            If you join our mailing list, we may send news, promotions, and shop updates. You
            can unsubscribe through the link in a marketing email or contact us. We may still
            send non-promotional messages that are necessary for an account, request, or order.
          </p>
        </article>

        <article>
          <h2>Data retention</h2>
          <p>
            We keep information only for as long as reasonably necessary for the purposes
            described in this policy, including customer service, security, legal, tax,
            accounting, employment, and dispute-resolution needs. Retention can vary by record
            type. When information is no longer needed, we take reasonable steps to delete,
            anonymize, or securely dispose of it. Information retained in backups may remain
            until those backups are overwritten in the ordinary course.
          </p>
        </article>

        <article>
          <h2>Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational measures intended
            to protect information. No website, network, or storage system is completely secure,
            and we cannot guarantee that information will never be accessed, lost, or disclosed
            without authorization. Keep your password confidential and contact us if you suspect
            unauthorized use of your account.
          </p>
        </article>

        <article>
          <h2>Your choices and requests</h2>
          <p>
            You may ask to access, correct, or delete personal information associated with you,
            or close an account, by contacting us. We may need to verify your identity before
            completing a request. Some information may be retained where permitted or required
            for legal, security, accounting, or legitimate operational reasons. Depending on
            where you live, applicable law may provide additional rights and an appeal process.
          </p>
          <p>
            For information submitted directly to an online ordering or payment provider,
            contact that provider as well because it independently controls information in its
            systems.
          </p>
        </article>

        <article>
          <h2>Children&apos;s privacy</h2>
          <p>
            This website is intended for a general audience and is not directed to children
            under 13. We do not knowingly collect personal information from children under 13.
            If you believe a child has provided such information, please contact us so we can
            review and address the request.
          </p>
        </article>

        <article>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as our website, services, or legal obligations change.
            The updated version will be posted here with a revised effective date. Material
            changes may also be communicated through the website or another appropriate method.
          </p>
        </article>

        <article>
          <h2>Contact us</h2>
          <p>
            For privacy questions or requests, use our <a href="/contact">contact page</a>, call
            <a href="tel:+19084818884"> (908) 481-8884</a>, email
            <a href="mailto:help@deafsharkcoffee.com"> help@deafsharkcoffee.com</a>, or write to
            Deaf Shark Coffee, 900 Green Lane, Union, NJ 07083.
          </p>
        </article>

        <p className="legal-updated">Effective: September 1, 2026</p>
      </section>

      <SiteFooter />
    </main>
  );
}
