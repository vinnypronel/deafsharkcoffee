import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Terms of Service | Deaf Shark Coffee",
  description: "Terms for the Deaf Shark Coffee website, accounts, rewards, and pickup ordering.",
};

export default function TermsPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/terms" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Terms of Service</h1>
          <p>The rules for our website, accounts, rewards, and pickup ordering.</p>
        </div>
      </section>

      <section className="legal-body">
        <article>
          <h2>Agreement and business identity</h2>
          <p>
            These Terms of Service govern deafsharkcoffee.com and the online services provided by
            Deaf Shark Coffee, LLC, doing business as Deaf Shark Coffee (&quot;Deaf Shark,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;), at 900 Green Lane, Union, New Jersey 07083. By creating an
            account or placing an order, you agree to these Terms and acknowledge our
            <a href="/privacy"> Privacy Policy</a>. Marketing consent is separate and optional.
          </p>
        </article>

        <article>
          <h2>Age requirements</h2>
          <p>
            You must be at least 13 to create an account. If you are 13 through 17, you may use an
            account and place an order only with the permission and involvement of a parent or
            legal guardian. The website is not directed to children under 13, and children under
            13 may not create accounts or provide personal information through the website.
          </p>
        </article>

        <article>
          <h2>Accounts</h2>
          <p>
            Provide accurate information, maintain only one personal account, and keep your login
            credentials confidential. Accounts may not be sold, assigned, or used to obtain
            duplicate rewards. Notify us promptly at
            <a href="mailto:help@deafsharkcoffee.com"> help@deafsharkcoffee.com</a> if you suspect
            unauthorized access. You are responsible for activity you authorize, subject to rights
            that cannot be limited by law.
          </p>
          <p>
            You may request account closure through an available account setting or by contacting
            us. Closing an account ends access to its order history and forfeits all unused points
            and promotional benefits.
            Purchased gift-card funds remain separate. We may retain transaction, security,
            suppression, and other records as explained in the Privacy Policy and permitted or
            required by law.
          </p>
        </article>

        <article>
          <h2>Pickup orders and acceptance</h2>
          <p>
            Website orders are for pickup at 900 Green Lane, Union, New Jersey. We do not offer
            shipping or delivery through the website. The ordering options displayed at checkout
            are the options currently available. Guest checkout may be offered only when online
            payment is available; otherwise, an account is required.
          </p>
          <p>
            Submitting an order is an offer to purchase. We accept it when we display or send a
            valid order confirmation. We may reject or cancel an order because of an unavailable
            item, pricing or description error, suspected fraud, store closure, equipment problem,
            or inability to fulfill the order. Review all items, customizations, contact details,
            pickup selections, discounts, and totals before submitting.
          </p>
        </article>

        <article>
          <h2>Payment</h2>
          <p>
            We may require online payment for a guest order or an account&apos;s first order. A
            returning account may be offered payment at pickup. The actual payment choices shown
            at checkout control for that order. Website order information does not automatically
            transfer into Genius POS; staff process pay-at-pickup orders at the store.
          </p>
          <p>
            Online card payments are processed by Stripe, whose terms and privacy policy may also
            apply. You authorize the total shown when you submit a paid order. Deaf Shark does not
            intend to receive or store a complete card number or card security code. Any card
            surcharge will be clearly and conspicuously disclosed before payment and will not
            exceed our actual cost to process that credit-card payment or any lower legal limit.
          </p>
        </article>

        <article>
          <h2>Prices, taxes, substitutions, and availability</h2>
          <p>
            Prices and availability may change for future orders. Applicable taxes, discounts,
            and fees are shown before submission. We will not increase the price of a confirmed
            order or substitute a more expensive item without your agreement. If an item is
            unavailable, we may contact you with an alternative or remove it and prepare the
            remainder. An amount paid for an item we do not provide will be refunded.
          </p>
        </article>

        <article>
          <h2>Pickup, changes, cancellations, and no-shows</h2>
          <p>
            Pickup times are estimates. Call <a href="tel:+19084818884">(908) 481-8884</a>
            immediately if you need a change or cancellation. We cannot guarantee changes after
            preparation begins. If you paid online and cancel before preparation begins, we will
            provide a full refund. Once preparation begins, all sales are final. Food, beverages,
            merchandise, and other purchases cannot be returned or refunded because you changed
            your mind, preferred a different taste, arrived late, or did not collect the order. If
            we cancel a paid order, we will provide a full refund.
          </p>
          <p>
            Tell us promptly if an item is incorrect, missing, defective, or has a substantiated
            quality issue. We may choose to remake or replace an affected item, but do not promise
            a refund after preparation begins except where applicable law requires one. Any refund
            generally returns to the original payment method; bank processing times vary. Nothing
            here limits a remedy that applicable law requires.
          </p>
        </article>

        <article>
          <h2>Food allergies</h2>
          <p>
            Our kitchen and bar handle dairy, tree nuts, peanuts, wheat and gluten, soy, eggs, and
            sesame. Shared equipment and preparation areas create a risk of cross-contact. We can
            discuss ingredient requests but cannot guarantee that an item is completely free of an
            allergen. For a food allergy, call the shop before ordering and speak with a team
            member; do not rely only on an online note.
          </p>
        </article>

        <article>
          <h2>Rewards, discounts, and promotions</h2>
          <p>
            Rewards are free promotional benefits for eligible account holders. Current earning
            and redemption rules are displayed with the program or offer. Points are earned only
            on qualifying completed purchases, have no cash value, and are not gift cards. They
            cannot be purchased, transferred, or sold. We may correct errors and remove benefits
            obtained through fraud, duplicate accounts, returns, or misuse.
          </p>
          <p>
            Each award of points expires 12 months after the date it is earned. Redemptions use the
            oldest unexpired points first. Closing an account forfeits all unused points. Rewards,
            points, student discounts, and promotional offers cannot be combined unless the terms
            displayed with a particular promotion expressly allow combining them.
          </p>
          <p>
            The verified Kean student discount is currently 10% on eligible orders. Birthday,
            welcome, referral, and other promotional benefits are subject to the limits displayed
            with each offer, including eligible items, maximum value, dates, and combination rules.
            The birthday benefit currently applies to one eligible drink up to $8, in store on the
            birthday shown in the account, and begins the following year if the birthday is first
            added on that date.
          </p>
          <p>
            We may change future earning rates and offers after notice. The stated 12-month
            expiration applies to every award. If we otherwise materially reduce the redemption
            value of already-earned points or discontinue rewards, we will provide reasonable
            notice where practicable, unless fraud, misuse, law, or circumstances outside our
            reasonable control require different action.
          </p>
        </article>

        <article>
          <h2>Gift cards and all-sales-final policy</h2>
          <p>
            Gift cards are currently sold only as physical cards at the store, not through this
            website. Purchased gift-card funds are separate from rewards. Gift-card funds do not
            expire, and we do not charge dormancy or inactivity fees. A remaining balance of $5 or
            less may be redeemed for cash where New Jersey law applies. Gift cards are not
            refundable except where required by law.
          </p>
          <p>
            All merchandise sales are final. Merchandise cannot be returned or exchanged for a
            change of mind. This policy does not eliminate remedies that cannot legally be waived,
            including remedies for an incorrect or defective item where applicable law requires
            them.
          </p>
        </article>

        <article>
          <h2>Order, account, email, and text communications</h2>
          <p>
            We may contact you about an order, account security, verification, password reset,
            rewards administration, or material service change. Providing a mobile number does not
            give blanket consent to marketing texts. If you agree to order-ready texts, message and
            data rates may apply and you may reply STOP or contact us to withdraw permission.
          </p>
          <p>
            Promotional email or text requires a separate choice where required. Marketing is not
            required to create an account or buy anything. You may use an unsubscribe link, reply
            STOP to marketing texts, or contact us to opt out.
          </p>
        </article>

        <article>
          <h2>Guest Wi-Fi</h2>
          <p>
            Guest Wi-Fi is offered as a courtesy during business hours and may be limited or
            discontinued. Availability, performance, and security are not guaranteed. Use
            encrypted services and appropriate device protections. Do not use the network
            unlawfully, interfere with other users, bypass security, or access another person&apos;s
            device or information without permission.
          </p>
        </article>

        <article>
          <h2>Acceptable use and ownership</h2>
          <p>
            Do not submit fraudulent orders, abuse rewards, create accounts through automation,
            scrape personal information, introduce malicious code, interfere with the website, or
            attempt to access another customer&apos;s account or data. Ordinary use of accessibility
            technology is permitted. Website text, designs, photographs, graphics, and logos are
            owned by Deaf Shark or used with permission and may not be commercially exploited
            without authorization.
          </p>
        </article>

        <article>
          <h2>Website availability and liability</h2>
          <p>
            The website is provided on an &quot;as available&quot; basis. To the extent permitted by law,
            we do not guarantee uninterrupted or error-free access or that every menu description,
            price, hour, photograph, or availability statement is current at every moment. This
            does not excuse inaccurate or misleading statements or limit warranties and consumer
            protections that cannot legally be waived.
          </p>
          <p>
            To the extent permitted by law, Deaf Shark is not liable for indirect, incidental,
            special, or consequential damages arising from the website, accounts, ordering system,
            rewards, or guest Wi-Fi. This exclusion does not apply to personal injury or death,
            fraud, gross negligence, willful misconduct, violations of the New Jersey Consumer
            Fraud Act or Products Liability Act, required refunds, or liability that cannot legally
            be excluded.
          </p>
        </article>

        <article>
          <h2>Suspension and closure</h2>
          <p>
            We may decline service, reject orders, or restrict an account for a legitimate reason,
            including suspected fraud, security risk, rewards abuse, repeated uncollected orders,
            unlawful conduct, or a material violation of these Terms, subject to applicable law
            and nondiscrimination requirements. Purchased gift-card funds remain valid. Legitimate
            points are forfeited when an account closes, whether closure is voluntary or follows a
            permitted suspension or termination.
          </p>
        </article>

        <article>
          <h2>Changes to these Terms</h2>
          <p>
            We may update these Terms prospectively by posting a revised version and effective
            date. The version in effect when an order is accepted governs that order. For a
            material change affecting existing accounts, we will provide appropriate notice and
            request acceptance when required before continued use of the affected service.
          </p>
        </article>

        <article>
          <h2>New Jersey law and disputes</h2>
          <p>
            New Jersey law governs these Terms, except where another law must apply. Disputes may
            be brought in an appropriate New Jersey state court or a federal court located in New
            Jersey, subject to any nonwaivable right to proceed elsewhere. Either party may use an
            eligible small-claims court. These Terms do not require arbitration or waive a jury
            trial. Contacting us first is encouraged but is not a condition of using a legal remedy
            or contacting a regulator.
          </p>
        </article>

        <article>
          <h2>General terms</h2>
          <p>
            If a provision is unenforceable, it will be limited or severed only as necessary and
            the remaining provisions continue. A failure to enforce a provision once is not a
            waiver. We may assign these Terms with a sale or transfer of the business while
            preserving existing contractual rights. Provisions concerning payments, refunds,
            ownership, limitations, privacy, and disputes survive where their nature requires.
          </p>
        </article>

        <article>
          <h2>Contact us</h2>
          <p>
            Contact Deaf Shark Coffee at <a href="mailto:help@deafsharkcoffee.com">help@deafsharkcoffee.com</a>,
            <a href="tel:+19084818884"> (908) 481-8884</a>, through our
            <a href="/contact"> contact page</a>, or at 900 Green Lane, Union, NJ 07083.
          </p>
        </article>

        <p className="legal-updated">Effective: September 14, 2026</p>
      </section>

      <SiteFooter />
    </main>
  );
}
