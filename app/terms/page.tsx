import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Terms of Service | Deaf Shark Coffee",
  description: "Terms that apply when using the Deaf Shark Coffee website and online services.",
};

export default function TermsPage() {
  return (
    <main className="content-page legal-page">
      <CustomerHeader active="/terms" />
      <section className="page-hero legal-hero">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Terms of Service</h1>
          <p>The terms that apply when you use our website and online services.</p>
        </div>
      </section>

      <section className="legal-body">
        <article>
          <h2>Agreement to these terms</h2>
          <p>
            These Terms of Service govern your use of the Deaf Shark Coffee website. By using
            the website, creating an account, or following its links to place an order, you
            agree to these terms and our <a href="/privacy">Privacy Policy</a>. If you do not
            agree, please do not use the website. You must be legally able to enter into this
            agreement or use the website with the involvement of a parent or legal guardian.
          </p>
        </article>

        <article>
          <h2>Website information and availability</h2>
          <p>
            We try to keep menu descriptions, prices, hours, photographs, availability, and
            other information accurate. Information may change without notice, and photographs
            are illustrative. The shop&apos;s current offerings and the information displayed by
            the online ordering service control if there is a difference. We may update,
            suspend, or discontinue part of the website when reasonably necessary.
          </p>
        </article>

        <article>
          <h2>Online ordering</h2>
          <p>
            Online ordering and checkout are provided through a third-party ordering service.
            Selecting an ordering link may take you to that service&apos;s website, where its own
            terms and privacy policy apply. Your order is not accepted merely because you begin
            checkout. Acceptance occurs when the ordering service or shop provides a valid
            confirmation and does not later reject the order because an item is unavailable, a
            payment cannot be authorized, the shop is closed, or the order cannot reasonably be
            fulfilled.
          </p>
          <p>
            Review your items, modifiers, contact information, pickup selection, and total
            before submitting an order. Contact the shop promptly if a confirmation is missing
            or appears incorrect. Do not submit the same order repeatedly unless you have
            confirmed that the earlier attempt failed.
          </p>
        </article>

        <article>
          <h2>Prices, taxes, and payment</h2>
          <p>
            Prices and availability are subject to change. Applicable taxes, fees, discounts,
            and the final total will be shown during checkout. Online payments are handled by
            the third-party ordering and payment service; this website does not receive your
            full payment card number. You authorize the amount shown at checkout when you submit
            a paid order. Your card issuer or payment provider may apply separate terms or fees.
          </p>
        </article>

        <article>
          <h2>Pickup</h2>
          <p>
            Pickup times are estimates, not guarantees. Preparation may take longer because of
            order volume, item availability, equipment issues, or other circumstances. Arrive at
            the location shown in your confirmation and be prepared to provide the customer name,
            order confirmation, or other reasonable proof of purchase. Food quality and safety
            may decline if an order is collected late.
          </p>
        </article>

        <article>
          <h2>Changes, cancellations, and refunds</h2>
          <p>
            Orders may enter preparation soon after acceptance. If you need to change or cancel
            an order, call the shop immediately at <a href="tel:+19084818884">(908) 481-8884</a>.
            We cannot promise that a change or cancellation will be possible after preparation
            begins. We are happy to make things right if something is not correct. Website orders are
            paid at the counter when you pick them up, so most problems are settled on the spot.
            If something is wrong with a quality issue, an incorrect item, or an error on our end,
            let us know the same day you pick up the order. If you have already paid and we owe
            you money back, it is returned to the card or cash you used at the register. Card
            refunds typically take 5 to 10 business days to appear, depending on your bank or card
            issuer. Nothing in these terms limits rights that cannot be waived under applicable
            consumer law.
          </p>
        </article>

        <article>
          <h2>Unavailable items</h2>
          <p>
            We make every effort to keep the online menu accurate, but an item may occasionally
            sell out before it is marked unavailable. If that happens, we will try to contact you
            before preparing the rest of the order and offer a substitute. If a substitute costs
            more than the original item, we will not charge the difference without checking with
            you first.
          </p>
          <p>
            If you do not want a substitute, we will simply not charge you for the unavailable
            item and prepare the rest of the order as usual. If we cannot reach you before the
            pickup time, the unavailable item is removed from your order and the remainder is
            ready for pickup. You only pay for what you receive.
          </p>
        </article>

        <article>
          <h2>Allergens and dietary needs</h2>
          <p>
            Our kitchen and bar handle dairy, tree nuts, peanuts, gluten/wheat, soy, egg, and
            sesame. We are glad to accommodate reasonable requests, such as using an alternative
            milk or leaving off a topping. Because our equipment and preparation areas are
            shared, however, we cannot guarantee that any item is completely free of these
            allergens or prevent all cross-contact.
          </p>
          <p>
            If you have a food allergy, tell a team member before ordering so we can discuss your
            options. Do not rely only on a website note or special-instructions field for a severe
            allergy. Menu descriptions are summaries and are not complete ingredient, nutrition,
            or allergen lists.
          </p>
        </article>

        <article>
          <h2>Guest Wi-Fi</h2>
          <p>
            Free Wi-Fi is available to customers during business hours. The network is open and
            unsecured. Avoid entering sensitive personal or financial information while
            connected, and use a VPN if you need to access sensitive information. Deaf Shark
            Coffee is not responsible for the security of devices or data on the guest network.
          </p>
        </article>

        <article>
          <h2>Accounts</h2>
          <p>
            If account features are offered, provide accurate information and keep your login
            credentials confidential. You are responsible for activity under your account unless
            applicable law provides otherwise. Notify us promptly if you suspect unauthorized
            access. We may restrict or close accounts involved in fraud, abuse, security threats,
            or material violations of these terms.
          </p>
          <p>
            Customers may access only their own account and order information. Attempting to
            access another customer&apos;s account, order, or personal information is prohibited.
          </p>
        </article>

        <article>
          <h2>Loyalty and promotions</h2>
          <p>
            If we offer loyalty benefits, rewards, coupons, or promotions, any additional rules
            presented with the offer also apply. Unless the offer states otherwise, benefits are
            personal, promotional, non-transferable, have no cash value, cannot be combined, and
            may be limited by item, time, or availability. We may correct points or benefits
            issued because of error, fraud, returned purchases, or abuse. We will provide notice
            of material program changes when reasonably practicable. Rights that cannot be
            limited by law remain unaffected.
          </p>
        </article>

        <article>
          <h2>Acceptable use</h2>
          <p>You may not:</p>
          <ul>
            <li>Place fraudulent, abusive, deceptive, or unauthorized orders.</li>
            <li>Access or attempt to access another person&apos;s account or order information.</li>
            <li>Interfere with the website, bypass security controls, or introduce malicious code.</li>
            <li>Use automated tools to scrape, overload, or misuse the website.</li>
            <li>Use the website or its content in violation of law or another person&apos;s rights.</li>
          </ul>
        </article>

        <article>
          <h2>Our content</h2>
          <p>
            The website and its original text, design, photographs, graphics, logos, and other
            content are owned by Deaf Shark Coffee or used with permission and are protected by
            applicable intellectual-property laws. You may use the website for personal,
            non-commercial purposes. These terms do not transfer ownership of our content or
            third-party trademarks to you.
          </p>
        </article>

        <article>
          <h2>Third-party services and links</h2>
          <p>
            The website may link to ordering, payment, maps, social media, authentication, or
            other third-party services. We do not control those services and are not responsible
            for their independent content, availability, security practices, or policies. Your
            use of them is governed by your agreement with the applicable provider.
          </p>
        </article>

        <article>
          <h2>Disclaimers and limitation of liability</h2>
          <p>
            To the extent permitted by law, the website is provided on an &quot;as available&quot; basis.
            We do not promise that it will always be uninterrupted, error-free, or free from
            harmful components. To the extent permitted by law, Deaf Shark Coffee is not liable
            for indirect, incidental, special, consequential, or punitive damages arising from
            use of the website or a third-party service. These limitations do not apply where
            prohibited by law and do not limit liability that legally cannot be limited.
          </p>
        </article>

        <article>
          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of the State of New Jersey, without regard to
            conflict-of-law principles, except where applicable law requires otherwise. Before
            beginning a formal dispute, we encourage you to contact us so we can try to resolve
            the issue directly. Nothing here prevents either party from using a court or process
            available under applicable law.
          </p>
        </article>

        <article>
          <h2>Changes to these terms</h2>
          <p>
            We may update these terms as the website, services, or legal requirements change.
            Updated terms will be posted here with a revised effective date. Your continued use
            of the website after an update means the revised terms apply to later use, to the
            extent permitted by law.
          </p>
        </article>

        <article>
          <h2>Contact us</h2>
          <p>
            Questions about these terms can be submitted through our
            <a href="/contact"> contact page</a>, by calling
            <a href="tel:+19084818884"> (908) 481-8884</a>, emailing
            <a href="mailto:help@deafsharkcoffee.com"> help@deafsharkcoffee.com</a>, or by writing
            to Deaf Shark Coffee, 900 Green Lane, Union, NJ 07083.
          </p>
        </article>

        <p className="legal-updated">Effective: September 1, 2026</p>
      </section>

      <SiteFooter />
    </main>
  );
}
