import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Privacy Policy | Deaf Shark Coffee",
  description: "How Deaf Shark Coffee collects, uses, discloses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/privacy" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>How we handle personal information through our website and online services.</p>
        </div>
      </section>

      <section className="legal-body">
        <article>
          <h2>Who we are and what this policy covers</h2>
          <p>
            This Privacy Policy describes how Deaf Shark Coffee, LLC, doing business as Deaf
            Shark Coffee (&quot;Deaf Shark,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), collects, uses,
            discloses, and retains personal information when you use deafsharkcoffee.com, create
            an account, place a pickup order, participate in our rewards and promotional programs,
            contact us, subscribe to marketing, apply for work, or otherwise use our online
            services. It does not govern information processed independently by a third party
            under that party&apos;s own privacy policy.
          </p>
        </article>

        <article>
          <h2>Personal information we collect</h2>
          <p>The information we collect depends on the features you use and may include:</p>
          <ul>
            <li><strong>Account and identity information:</strong> name, email address, phone number, account identifier, password credential maintained through our authentication system, profile image, the policy versions and time you accepted them, and your confirmation that you meet the account age requirement or have required guardian involvement.</li>
            <li><strong>Google sign-in information:</strong> the name, email address, profile information, and identifier Google makes available when you choose Google sign-in. We do not receive your Google password.</li>
            <li><strong>Order information:</strong> ordered items, selections and customizations, special instructions, prices, taxes, discounts, pickup selection and estimate, order status, customer name and phone number, payment method category, and order history associated with an account.</li>
            <li><strong>Rewards and eligibility information:</strong> points and redemption history, birthday month and day, welcome and birthday benefits, referral activity, promotions, and a Kean University email address and verification date if you request the student discount.</li>
            <li><strong>Communications and marketing choices:</strong> messages sent through our contact form, your responses to us, newsletter status, consent language, and the time and source of a marketing choice.</li>
            <li><strong>Employment information:</strong> contact details, availability, work-related responses, age-of-majority response, resume and file metadata, and application status.</li>
            <li><strong>Device, network, and security information:</strong> IP address, browser or device information, user agent, requested pages, timestamps, referring page, session and cookie identifiers, rate-limit records, and information used to detect fraud, spam, or security incidents.</li>
          </ul>
          <p>
            Please do not place sensitive medical information in an order note, contact message,
            or job application. Call the shop before ordering if you need to discuss a food allergy.
          </p>
        </article>

        <article>
          <h2>Payments</h2>
          <p>
            The payment choices shown at checkout are the choices currently available. Orders
            marked for payment at pickup are paid at the store. Online card payments are processed
            by Stripe. Card and other payment credentials are submitted directly to Stripe and
            governed by Stripe&apos;s privacy policy. We may receive limited details such as a transaction
            identifier, payment status, card brand and last four digits, refund status, and fraud
            signals, but we do not intend to receive or store a full payment-card number or card
            security code on our website servers.
          </p>
        </article>

        <article>
          <h2>How we collect information</h2>
          <p>
            We collect information directly from you, automatically when you use the website,
            from Google when you choose Google sign-in, from service providers that support the
            features you use, and from staff when they update an order, application, or rewards
            record. Website order information is managed in our website system and does not flow
            automatically into the shop&apos;s Genius POS system.
          </p>
        </article>

        <article>
          <h2>How we use information</h2>
          <ul>
            <li>Provide, secure, maintain, troubleshoot, and improve the website.</li>
            <li>Create and authenticate accounts and respond to account-security requests.</li>
            <li>Accept, prepare, fulfill, support, and maintain records of pickup orders.</li>
            <li>Administer rewards, referrals, birthday benefits, promotions, and student discounts.</li>
            <li>Send order-ready, verification, password-reset, and other service communications.</li>
            <li>Send marketing only in accordance with your choices and applicable law.</li>
            <li>Respond to messages, feedback, privacy requests, and customer-service concerns.</li>
            <li>Review employment applications and communicate with applicants.</li>
            <li>Detect and prevent fraud, spam, misuse, and security incidents.</li>
            <li>Comply with legal, tax, accounting, recordkeeping, and dispute-resolution needs.</li>
          </ul>
        </article>

        <article>
          <h2>Cookies and similar technologies</h2>
          <p>
            We use cookies, local storage, and similar technologies needed for sign-in, security,
            fraud prevention, cart and session functions, preferences, and basic website operation.
            Blocking necessary technologies may prevent parts of the website from working. We do
            not currently use advertising pixels or personal information for targeted advertising.
            Before introducing optional analytics or advertising technologies, we will update this
            policy and provide notice or choices required by applicable law.
          </p>
        </article>

        <article>
          <h2>When we disclose information</h2>
          <p>
            We do not sell personal information for money, rent customer lists, or disclose
            personal information for another company&apos;s independent direct marketing. We may
            disclose information to service providers that support hosting, databases, file
            storage, security and bot prevention, authentication, email delivery, text messaging,
            payment processing when offered, and professional services. Depending on the feature,
            these providers may include Cloudflare, Google, an email-delivery provider, Twilio,
            and Stripe for online payment processing.
          </p>
          <p>
            We may also disclose information when reasonably necessary to comply with law or a
            lawful request, protect customers or the business, investigate fraud or misuse,
            enforce agreements, obtain professional advice, or complete a merger, financing, sale,
            or transfer of business assets. Employment applications are not disclosed to unrelated
            parties for their own marketing.
          </p>
        </article>

        <article>
          <h2>Email and text messages</h2>
          <p>
            Account, order, verification, password-reset, and security messages are service
            communications. If you provide a mobile number for an order and agree to receive an
            order-ready text, we may send a transactional text when the order is ready. Message and
            data rates may apply. You may reply STOP or contact us to withdraw permission for
            future texts.
          </p>
          <p>
            Promotional email is optional and is not required to create an account or place an
            order. When promotional email becomes available, you may unsubscribe using the link in
            any marketing email or by contacting us. We may retain a minimal suppression record so
            that we can continue honoring an opt-out.
          </p>
        </article>

        <article>
          <h2>Retention</h2>
          <p>
            We retain each category of information only for as long as reasonably necessary for
            the purposes described here. The period depends on whether your account remains
            active, whether an order or request is still open, warranty and customer-service needs,
            fraud and security risks, tax and accounting requirements, employment-record rules,
            and potential disputes. Closing an account removes access to the account but does not
            require us to erase transaction, suppression, security, or other records that we are
            permitted or required to retain. When information is no longer needed, we delete,
            anonymize, or securely dispose of it. Backup copies are removed through the ordinary
            backup-rotation process.
          </p>
        </article>

        <article>
          <h2>Security and incident response</h2>
          <p>
            We use administrative, technical, and organizational safeguards designed for the
            nature of the information we maintain, including access controls, encrypted network
            connections, authentication, rate limiting, and security screening. No system can be
            guaranteed completely secure. If a security incident affects personal information, we
            will investigate and provide notices required by applicable law. Keep your credentials
            confidential and contact us promptly if you suspect unauthorized account activity.
          </p>
        </article>

        <article>
          <h2>Your choices and privacy requests</h2>
          <p>
            You may ask to access, correct, or delete personal information associated with you,
            obtain a copy of information you provided, or close your account by emailing
            <a href="mailto:help@deafsharkcoffee.com"> help@deafsharkcoffee.com</a>. An account
            settings provides authenticated download and account-closure options. We will verify
            requests to protect customer
            information. We may deny or limit a request where permitted or required for security,
            fraud prevention, legal compliance, recordkeeping, another person&apos;s privacy, or the
            establishment or defense of legal claims. If applicable law gives you additional
            rights or a right to appeal a decision, we will honor those requirements.
          </p>
        </article>

        <article>
          <h2>Children and teenagers</h2>
          <p>
            The website is a general-audience service and is not directed to children under 13.
            You may not create an account if you are under 13. Customers aged 13 through 17 may
            use an account only with the permission and involvement of a parent or legal guardian.
            If you believe a child under 13 provided personal information, contact us so we can
            investigate and take appropriate action.
          </p>
        </article>

        <article>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy when our services, vendors, or legal obligations change. We
            will post the updated version with a revised effective date. We will provide additional
            notice or request consent before a materially different use where required by law.
          </p>
        </article>

        <article>
          <h2>Contact us</h2>
          <p>
            Email privacy questions or requests to
            <a href="mailto:help@deafsharkcoffee.com"> help@deafsharkcoffee.com</a>, call
            <a href="tel:+19084818884"> (908) 481-8884</a>, use our
            <a href="/contact"> contact page</a>, or write to Deaf Shark Coffee, 900 Green Lane,
            Union, NJ 07083.
          </p>
        </article>

        <p className="legal-updated">Effective: September 14, 2026</p>
      </section>

      <SiteFooter />
    </main>
  );
}
