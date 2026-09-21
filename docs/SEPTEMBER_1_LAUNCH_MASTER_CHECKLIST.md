# Deaf Shark Coffee — September 1 Launch Master Checklist

Prepared August 22, 2026

Ordering architecture update, September 2, 2026: the website now takes its own
pickup orders. Heartland/Genius hosted ordering is no longer the launch path, and
every item below that assumes a hosted cart, hosted payment, or a launch loyalty
program is superseded. Phase one is pay at pickup, with no card data collected by
this website, no active public customer-account controls, and no customer-facing
loyalty claim. Online prepay stays blocked until the business chooses and provides
access to its own payment processor.

Owner response recorded September 1–2, 2026: `admin@deafsharkcoffee.com` is the primary ownership/admin address; `miguelmerino@msn.com` is the off-domain backup ownership/recovery address; contact messages go to `contact@deafsharkcoffee.com`; applications go to `employment@deafsharkcoffee.com`; public support uses `help@deafsharkcoffee.com`; and the public phone and social links are approved. Updated hours, complete menu approval, final legal documents, and Genius payment readiness remain pending.

## The launch rule

Production accounts, customer data, payments, domains, app-store listings, and messaging registrations should be owned by Deaf Shark Coffee. The owner should invite Vinny using a separate administrator/developer login. Nobody should share passwords, recovery codes, API keys, or banking credentials over text or chat.

There are two separate launch goals:

1. **September 1 website launch:** public website, accurate menu, secure accounts, real ordering path, forms, payment decision, notifications, and an operational staff workflow.
2. **Mobile app launch:** begin business enrollment immediately, but do not promise Apple or Google approval by September 1. Launch the website as an installable web app first, then submit native store packages when the business accounts and app are ready.

## Current build: what already exists

- [x] Responsive customer website with Home, Menu, Our Story, Events, Visit Us, and Employment pages.
- [x] Pickup ordering interface with cart and item customization.
- [x] D1 database schema for customers, sessions, orders, loyalty balances, menu availability, and store settings.
- [x] Email/password customer account interface.
- [x] Optional Google sign-in code path.
- [x] Customer order status interface.
- [x] Staff order dashboard with New, Preparing, Ready, and sold-out controls.
- [x] Food, coffee, cold-drink, breakfast, sandwich, bite, and coffee-bean catalog data.
- [x] Coffee and kitchen preparation-station labels on products/orders.
- [x] Loyalty-point earning prototype.
- [x] Employment form design.
- [x] Newsletter signup design.
- [x] Private online demo.

## Current build: important things that are not production-ready

- [ ] Production resources are not yet inside a Deaf Shark-owned Cloudflare account.
- [ ] The current public demo is private and is not the final business-domain deployment.
- [ ] Card payment is a visual demo. Stripe is not connected.
- [ ] Quantic POS and its two KDS screens are not connected.
- [ ] Staff dashboard and mutation APIs are not protected by staff authorization.
- [ ] Newsletter signup currently displays success but saves and sends nothing.
- [x] Employment applications are saved, résumé uploads use private R2 storage, and notifications have a dedicated employment recipient.
- [x] Customer contact messages are saved and have a dedicated contact recipient.
- [ ] Transactional order emails are not connected.
- [ ] Ready-for-pickup SMS is not connected.
- [ ] Email verification, password reset, and account-recovery delivery need a real sender.
- [ ] Google OAuth credentials are not configured.
- [ ] Loyalty reward redemption is not implemented and rules are not approved.
- [ ] Complete menu, prices, modifiers, allergens, hours, taxes, and policies still require final owner approval.
- [ ] Database backups, monitoring, rate limits, spam protection, and a production recovery plan are incomplete.
- [ ] Native iOS and Android apps have not been packaged or submitted.

# Section A — Accounts the owner should create or confirm

## A1. Required immediately

### 1. Cloudflare business account

- [ ] Create with a business-controlled email address.
- [ ] Add business billing details.
- [ ] Enable two-factor authentication.
- [ ] Save recovery codes somewhere controlled by the owner.
- [ ] Invite Vinny as an administrator/developer.
- [ ] Create production and staging Workers environments.
- [ ] Create production D1 database for customers, orders, menu, loyalty, and forms.
- [ ] Create R2 storage for resumes and future uploads.
- [ ] Add the business domain to Cloudflare or confirm existing DNS access.
- [ ] Create Turnstile widgets for public forms and account abuse protection.
- [ ] Decide whether to use Workers Paid. It is recommended for a commercial ordering application.

Owner must have available: legal business name, business email, billing card, domain access, and business phone.

### 2. Domain registrar and DNS account

- [ ] Confirm exactly where `deafsharkcoffee.com` is registered.
- [ ] Confirm the owner controls the registrar email, password, recovery phone, and renewal payment.
- [ ] Enable registrar lock and two-factor authentication.
- [ ] Confirm the domain will not expire during launch.
- [ ] Obtain permission to change DNS records for the website, Google sign-in, email, and verification services.
- [ ] Do not transfer the domain to Vinny personally.

### 3. Quantic POS / myQuantic account and support request

- [ ] Owner confirms the existing Quantic account and location administrator.
- [ ] Add Vinny as a permitted technical contact if Quantic supports it.
- [ ] Open an urgent support/onboarding request asking for the supported way to send custom website pickup orders into their POS.
- [ ] Ask whether Quantic Ecommerce Express should be used, embedded, linked, or integrated by an approved API.
- [ ] Ask whether Quantic provides public/private order APIs, webhooks, sandbox credentials, or an integration partner.
- [ ] Ask whether their current subscription includes online ordering, eCommerce, KDS routing, loyalty, and gift-card modules.
- [ ] Confirm both KDS screen names, location IDs, credentials, and preparation-routing rules.
- [ ] Confirm coffee-only items route to the front KDS, food items route to the kitchen KDS, and mixed orders split correctly.
- [ ] Confirm who changes menu items and sold-out status: Quantic, our dashboard, or both.
- [ ] Confirm whether Quantic must be the authoritative menu and price source.
- [ ] Confirm whether Quantic can accept externally paid Stripe orders or requires its own supported payment gateway.
- [ ] Request a live test order with a Quantic representative before launch.

**Launch blocker:** Do not promise automatic POS/KDS delivery until Quantic approves and successfully tests the path. Quantic already offers its own eCommerce and KDS capabilities, so the supported route may be using their module rather than a direct custom API.

### 4. Stripe business account

- [ ] Owner creates the account in the business's legal name.
- [ ] Complete identity and business verification.
- [ ] Connect the business bank account.
- [ ] Invite Vinny as a developer, not account owner.
- [ ] Enable two-factor authentication.
- [ ] Set business name, statement descriptor, support email, support phone, and receipt branding.
- [ ] Configure test mode first.
- [ ] Obtain restricted test and production keys through secure secret storage.
- [ ] Configure webhook endpoints for successful payment, failed payment, refund, and dispute events.
- [ ] Confirm whether Stripe or Quantic will process online payments before integration begins.
- [ ] Confirm refund and cancellation authority.
- [ ] Do not add a separate customer processing fee until the business confirms the applicable law, card-network rules, and processor requirements.

Owner must have available: legal name, EIN/tax information, owner identity, business address, bank routing/account information, support contact, and business website.

### 5. Business email and shared inboxes

Choose Google Workspace, Microsoft 365, or the business's existing email provider.

- [ ] Ensure the owner controls the primary administrator account.
- [x] Confirm `admin@`, `contact@`, `employment@`, `help@`, and `webdev@deafsharkcoffee.com` as the approved operational addresses.
- [x] Off-domain backup ownership/recovery address confirmed: `miguelmerino@msn.com`.
- [ ] Give the correct people access without sharing one password.
- [ ] Enable two-factor authentication.
- [ ] Configure SPF, DKIM, and DMARC DNS records.
- [x] Contact inquiries → `contact@`; employment applications → `employment@`; administrative alerts/access → `admin@`; public support → `help@deafsharkcoffee.com`.

### 6. Transactional email provider

The application prefers the native Cloudflare Email Service binding and retains Resend as an optional fallback.

- [ ] Enable Email Sending in the Deaf Shark-owned Cloudflare account and invite Vinny with technical access.
- [ ] Verify `deafsharkcoffee.com` for transactional sending.
- [ ] Add required SPF/DKIM records and a DMARC policy.
- [ ] Create production sender identities.
- [ ] Configure order confirmation, ready notice fallback, password reset, email verification, application receipt, and contact receipt templates.
- [ ] Set reply-to addresses to inboxes people actually monitor.
- [ ] Test delivery to Gmail, Outlook, and iCloud.
- [ ] Track bounces and suppress invalid addresses.

Approved addresses:

- `orders@deafsharkcoffee.com` for order confirmations.
- `account@deafsharkcoffee.com` for verification and password recovery.
- `employment@deafsharkcoffee.com` for employment notifications.
- `contact@deafsharkcoffee.com` for contact-form notifications.
- `admin@deafsharkcoffee.com` for security and operational alerts.
- `help@deafsharkcoffee.com` for public customer support.

### 7. Twilio business account for transactional SMS

- [ ] Owner creates and pays for the account.
- [ ] Upgrade from trial before registration.
- [ ] Complete the business/compliance profile using the exact legal business information.
- [ ] Purchase a local number or decide on a verified toll-free sender.
- [ ] Register the business brand and order-status campaign.
- [ ] Document the exact consent shown at checkout.
- [ ] Support STOP, START, and HELP behavior where required.
- [ ] Limit texts to transactional order messages unless separate marketing consent is collected.
- [ ] Invite Vinny as administrator/developer.
- [ ] Store credentials only as production secrets.
- [ ] Add a notification log so the same Ready text cannot send twice.
- [ ] Keep email as the September 1 fallback because carrier approval can extend beyond launch day.

Suggested checkout consent: “By providing your mobile number, you agree to receive transactional text messages about this order. Message and data rates may apply. Reply STOP to opt out.” Have the business review the final language.

### 8. Google business account and Google Cloud project

- [ ] Use a business-owned Google account, preferably on the business domain.
- [ ] Confirm Google Business Profile ownership and accurate hours, address, phone, photos, and website.
- [ ] Create a Google Cloud project for customer Google sign-in.
- [ ] Configure the OAuth consent screen, authorized JavaScript origins, and redirect URLs.
- [ ] Invite Vinny with appropriate project access.
- [ ] Configure Google Search Console.
- [ ] Configure Google Analytics 4 only after the privacy/cookie decision is made.
- [ ] Submit sitemap and confirm site ownership after the production domain is live.

### 9. Source-code ownership

- [ ] Create a Deaf Shark-owned GitHub organization or repository, or document the transfer arrangement in writing.
- [ ] Owner has at least one administrator account.
- [ ] Vinny has development/admin access.
- [ ] Enable two-factor authentication.
- [ ] Store no live secrets in the repository.
- [ ] Protect the production branch and tag the launch release.

## A2. Required for marketing email

Choose one marketing platform. Do not create several overlapping subscriber lists.

### Recommended choice: Mailchimp, Brevo, or Resend Broadcasts

- [ ] Owner creates and owns the account.
- [ ] Invite Vinny as manager/developer.
- [ ] Create one clean Deaf Shark audience/list.
- [ ] Use explicit email-marketing consent.
- [ ] Prefer double opt-in for clean addresses and proof of consent.
- [ ] Store signup source, time, IP/consent version where appropriate, and provider contact ID.
- [ ] Provide unsubscribe and preference links in every marketing email.
- [ ] Do not silently subscribe account holders, job applicants, contact-form users, or ordering customers.
- [ ] Decide what “birthday perk” actually means before advertising it.
- [ ] Write and test the welcome email.

Transactional messages and marketing messages are different. Order confirmations and password resets are transactional; promotions, new-roast announcements, and newsletters require marketing consent and unsubscribe controls.

## A3. Recommended operational accounts

### Error monitoring

- [ ] Create a business-owned Sentry account or use Cloudflare observability.
- [ ] Capture server errors, failed payments, failed POS delivery, email failures, and SMS failures.
- [ ] Remove passwords, full payment data, and unnecessary personal information from logs.

### Uptime monitoring

- [ ] Create a business-owned monitoring account or Cloudflare health checks.
- [ ] Monitor home page, menu-state API, checkout API, dashboard availability, and POS handoff.
- [ ] Alert Vinny and one business owner.

### Accounting/bookkeeping

- [ ] Confirm whether Stripe and Quantic reports feed QuickBooks or another bookkeeping system.
- [ ] Define how online revenue, refunds, tips, tax, and fees reconcile daily.

### Password manager

- [ ] Use 1Password, Bitwarden, or another shared business vault.
- [ ] Store recovery codes and emergency access there.
- [ ] Store API credentials in platform secret storage, not only in the password manager.

## A4. Mobile app accounts to begin now

### Apple Developer Program

- [ ] Enroll as the legal organization, not under Vinny's personal name.
- [ ] Confirm the business is a legal entity. A DBA alone is not accepted for organization enrollment.
- [ ] Look up or request the organization's D-U-N-S number.
- [ ] Use an email address on the business domain.
- [ ] Ensure the website is public and functional.
- [ ] Owner or legally authorized employee completes enrollment.
- [ ] Pay the current $99 annual membership after approval.
- [ ] Invite Vinny through App Store Connect after enrollment.
- [ ] Create the app record only after the bundle identifier, legal name, support URL, privacy URL, and app name are final.

### Google Play Console

- [ ] Create an Organization developer account owned by Deaf Shark.
- [ ] Obtain/confirm the D-U-N-S number and website.
- [ ] Pay the current $25 one-time registration fee.
- [ ] Complete organization and identity verification.
- [ ] Invite Vinny as developer/admin instead of sharing the login.
- [ ] Reserve the Android package name.
- [ ] Complete the data-safety form, privacy policy, content rating, app access instructions, and store listing before submission.

### App implementation path

- [ ] Phase 1: make the website a polished installable Progressive Web App.
- [ ] Add web-app manifest, icons, theme colors, install behavior, and safe update behavior.
- [ ] Do not cache checkout, authentication, order status, or live menu data incorrectly.
- [ ] Phase 2: package the shared application for iOS and Android.
- [ ] Add native deep links, secure storage, notification permissions, splash screens, and store assets.
- [ ] Test account deletion and privacy flows required by the stores.
- [ ] Submit after production website, authentication, and payments are stable.

## A5. Potential later accounts and integrations

- [ ] Meta Developer account for Facebook login. Not needed for launch; Google and email are enough.
- [ ] Apple sign-in configuration if the native iOS app offers other social sign-in providers.
- [ ] DoorDash, Uber Eats, Grubhub, Chowly, or Quantic Stream for future delivery/aggregation.
- [ ] Push-notification service for native/PWA notifications.
- [ ] Customer-support or help-desk system.
- [ ] Gift-card provider if Quantic's gift-card module is not used.
- [ ] Payroll/applicant-tracking service if job applications outgrow the dashboard.
- [ ] Product photo storage/CDN expansion in R2.
- [ ] Legal-policy generator/service if the business does not use its attorney.

# Section B — Owner decisions required before development can be finalized

## Business and ordering

- [ ] Exact legal business name and public brand name.
- [ ] Updated standard hours are pending confirmation from Miguel; do not publish the previously proposed September schedule as final.
- [ ] Online-order start/end times and last-order cutoff.
- [ ] ASAP pickup estimate rules.
- [x] Scheduled pickup is enabled and must be paid online in advance.
- [ ] Minimum/maximum scheduled lead time and slot size.
- [x] Pay at pickup is allowed only for signed-in members placing ASAP orders.
- [ ] Cancellation, no-show, and chargeback rules remain pending. Refund policy is approved for same-day quality issues, incorrect items, or store errors; refunds return to the original payment method in approximately 5–10 business days.
- [ ] Whether tips are allowed and suggested percentages.
- [ ] Maximum order size and whether large/catering orders require a call.
- [ ] Who can pause orders, change prep time, issue refunds, and mark items sold out.

## Menu

- [ ] Complete item list and spelling.
- [ ] Final in-store and online prices.
- [ ] Sizes and size prices.
- [ ] Required choices and default choices.
- [ ] Milk types and upcharges.
- [ ] Syrup flavors and upcharges.
- [ ] Extra shots and upcharges.
- [x] Hot-only items confirmed: cortado, espresso, hot tea, and cappuccino.
- [ ] Light ice, no ice, extra ice, sweetness, temperature, and preparation choices.
- [ ] Finish sandwich/breakfast bread choices and substitutions. Plain and everything are the only bagel types currently confirmed.
- [ ] Finish add-ons, removals, and “no” ingredients. Confirmed $1 choices: Swiss swap, extra cheese, add bacon, and extra bacon.
- [x] Smoothie base choices confirmed: Water or Milk.
- [x] Half-caf is not offered; decaf is $1 extra and needs a twice-normal-preparation-time warning.
- [ ] Refrigerator brands, sizes, flavors, and prices.
- [ ] Coffee bag sizes, roast details, and grind choices.
- [x] Allergen and cross-contact disclaimer approved for dairy, tree nuts, peanuts, gluten/wheat, soy, egg, and sesame in a shared environment.
- [ ] Tax class for every category.
- [ ] Prep station for every item: Coffee, Kitchen, or Retail.
- [ ] Which items may be scheduled or ordered near closing.

## Loyalty

- [ ] Points earned per dollar and rounding rule.
- [ ] Whether tax, tips, fees, gift cards, and discounts earn points.
- [ ] Reward thresholds and exact rewards.
- [ ] Whether rewards expire.
- [ ] Birthday reward and eligibility rules.
- [ ] Whether points can be earned/redeemed in both Quantic and the website.
- [ ] Whether Quantic's native loyalty module should be the source of truth.
- [ ] Rules for refunds, cancelled orders, duplicate accounts, manual adjustments, and fraud.

## Forms and communications

- [x] Contact-form recipient: `contact@deafsharkcoffee.com`.
- [x] Job-application recipient: `employment@deafsharkcoffee.com`.
- [ ] Resume retention period and deletion process.
- [ ] Whether applicants receive an automatic receipt.
- [ ] Whether the newsletter promise includes a birthday perk, discount, events, or early access.
- [ ] Final order-confirmation email wording.
- [ ] Final Ready text wording and customer consent wording.
- [ ] Whether customers receive Complete, Cancelled, refund, or failed-payment notices.

## Brand and legal verification

- [ ] Approve El Salvador farm/origin claims.
- [ ] Approve veteran-owned statement.
- [ ] Approve product photos and descriptions.
- [ ] Phone `(908) 481-8884` is approved; updated hours remain pending.
- [ ] Owner supplied refund, unavailable-item, allergen, and guest Wi-Fi wording. Final Terms and Privacy documents are still pending owner delivery/review.

# Section C — Production database work

## Infrastructure

- [ ] Create Deaf Shark-owned production D1 database.
- [ ] Create separate staging D1 database with no real customer data.
- [ ] Create R2 bucket for resumes and future private uploads.
- [ ] Bind production resources to the Worker.
- [ ] Store secrets using Cloudflare secret management.
- [ ] Create repeatable migrations and apply them in staging first.
- [ ] Create scheduled backups/exports and test a restore.
- [ ] Define data retention and deletion rules.

## Tables and data models still needed

- [ ] Menu categories.
- [ ] Products.
- [ ] Product prices/sizes.
- [ ] Modifier groups and modifier choices.
- [ ] Product-to-modifier rules.
- [ ] Product prep-station routing.
- [ ] Product images and display order.
- [ ] Availability and optional inventory counts.
- [ ] Store hours and holiday closures.
- [ ] Staff users, roles, and permissions.
- [ ] Payment records and Stripe identifiers.
- [ ] Refund and cancellation records.
- [ ] POS-delivery attempts and acknowledgements.
- [ ] Notification deliveries and idempotency keys.
- [ ] Newsletter subscription, consent, confirmation, and unsubscribe records.
- [ ] Contact inquiries and status.
- [ ] Employment applications and resume-object references.
- [ ] Audit log for staff changes.
- [ ] Loyalty reward definitions and redemption ledger.

## Database/admin behavior

- [ ] Replace the hardcoded menu as the long-term source of truth, or implement a controlled Quantic menu sync.
- [ ] Create owner-facing menu CRUD controls.
- [ ] Allow safe price, description, modifier, photo, station, and sold-out changes.
- [ ] Prevent deletion of products referenced by historical orders; archive them instead.
- [ ] Snapshot item names, prices, tax, and modifiers into each order.
- [ ] Add pagination, search, filters, exports, and date ranges for operational records.
- [ ] Restrict resume/application access to authorized staff only.

# Section D — Authentication, security, and permissions

- [ ] Move authentication secret and production URL to secure production secrets.
- [ ] Enable and test email verification.
- [ ] Implement forgot-password and reset-password emails.
- [ ] Configure Google OAuth production redirect URLs.
- [ ] Decide whether Facebook login is deferred. Recommended: defer it.
- [ ] Add staff role(s): owner/admin, manager, kitchen, coffee, read-only/support as needed.
- [ ] Protect `/dashboard` server-side.
- [ ] Protect every order/menu/settings mutation API server-side.
- [ ] Do not rely on a hidden link as security.
- [ ] Add session expiration, sign-out-all-sessions, and account deletion.
- [ ] Add rate limiting to sign-in, signup, password reset, forms, order lookup, and checkout.
- [ ] Add Turnstile with mandatory server validation to public abuse-prone forms.
- [ ] Validate and normalize phone/email input.
- [ ] Limit upload type and size; verify file signatures; use private R2 objects.
- [ ] Add security headers and content-security policy.
- [ ] Review logs for personal-information leakage.
- [ ] Add audit records for price, availability, refund, loyalty, and status changes.
- [ ] Test ordinary customer accounts cannot reach staff data.

# Section E — Ordering, payments, and Quantic/KDS

## Checkout

- [ ] Require customer name, email, and phone as approved.
- [ ] Prefill saved profile data for signed-in customers.
- [ ] Validate business hours and sold-out status server-side at final submission.
- [ ] Calculate all prices and taxes server-side.
- [ ] Add order idempotency to prevent duplicate orders from double taps/retries.
- [ ] Add explicit transactional SMS consent.
- [ ] Add pickup instructions and cancellation policy acknowledgment.
- [x] Guest checkout is allowed only with advance online payment; guests cannot pay at pickup.
- [x] Scheduled pickup requires advance online payment.
- [x] Automatically confirm submitted orders without a separate employee acceptance step.
- [ ] Implement customer cancellation and a full refund only while an order is New, before Preparing.
- [x] Unavailable-item procedure approved: contact the customer, offer a substitute, do not charge a higher difference without approval, otherwise refund the unavailable item and prepare the remainder; automatically do the latter if the customer cannot be reached before pickup.

## Stripe

- [ ] Build real Stripe payment flow in test mode.
- [ ] Never store raw card numbers in Deaf Shark's database.
- [ ] Create the order only after authoritative payment status is known, or hold it pending until webhook confirmation.
- [ ] Validate webhook signatures.
- [ ] Make webhook handling idempotent.
- [ ] Record payment ID, amount, status, fee/refund references, and timestamps.
- [ ] Handle abandoned, failed, delayed, duplicated, disputed, and refunded payments.
- [ ] Test Apple Pay/Google Pay only if enabled and domain verification is complete.
- [ ] Test real low-value payment and refund before launch.

## Quantic and two KDS screens

- [x] Keep Quantic as the production POS for launch.
- [x] Defer a custom Deaf Shark POS/register interface to a future phase.
- [x] Defer the custom staff preparation dashboard/KDS to a future phase or emergency fallback.
- [ ] Choose the Quantic-approved integration path.
- [ ] Make the production website submit completed online orders into Quantic.
- [ ] Map website product IDs/modifiers to Quantic catalog IDs.
- [ ] Map every order item to Coffee, Kitchen, or Retail.
- [ ] Split mixed orders correctly without losing one customer order number.
- [ ] Confirm drink line items reach the front coffee preparation screen.
- [ ] Confirm food line items reach the kitchen preparation screen.
- [ ] Send payment status, tip, tax, pickup time, customer name, phone, and notes.
- [ ] Receive or poll acknowledgment from Quantic.
- [ ] Retry transient failures without creating duplicates.
- [ ] Alert staff when an order cannot enter Quantic.
- [ ] Show source badge “Online” in Quantic/custom fallback dashboard if supported.
- [ ] Decide which system owns status changes.
- [ ] Sync Ready status back to the website before sending customer notifications.
- [ ] Complete test cases: coffee only, food only, mixed order, sold-out item, modifier upcharge, scheduled order, refund, cancellation, and connection failure.

### Diagnose the shop's existing missing-item routing issue

- [ ] List specific items that correctly reach a preparation screen and items that do not.
- [ ] For each failed example, record the date/time, Quantic order number, register used, order type, and expected preparation screen.
- [ ] Determine whether the entire order is missing, only a line item is missing, or the item appears on the receipt/POS but not on the KDS.
- [ ] Compare a working and non-working item's Quantic configuration: category/department, course, preparation station, printer/KDS routing, product type, active menu, and fulfillment/order-type rules.
- [ ] Test a failing item by itself and in a mixed order, both with and without modifiers.
- [ ] Test from each in-store register to determine whether the problem follows the item configuration or one register/device.
- [ ] Verify both Quantic preparation screens are online, synchronized, and assigned to the intended station.
- [ ] Capture Quantic app/software versions and the names/models of both preparation-screen devices.
- [ ] Obtain Quantic owner/admin access or schedule a session with the owner present. Do not request or store the owner's password in project files.
- [ ] Open a Quantic support case with example order numbers and configuration screenshots if the routing difference is not visible in the admin settings.
- [ ] Retest every previously failing item after configuration changes and save the results.

## Fallback plan if Quantic is not approved by cutoff

- [ ] Owner explicitly chooses one safe fallback:
  - Quantic Ecommerce Express instead of custom checkout;
  - Custom dashboard with manual Quantic entry;
  - Printed/manual ticket workflow;
  - Website menu launches but online ordering remains disabled temporarily.
- [ ] Train staff on the chosen fallback.
- [ ] Display accurate customer wording; never claim direct POS delivery if it is manual.

# Section F — Email, SMS, newsletter, contact, and employment

## Transactional email

- [ ] Order confirmed template.
- [ ] Order cancelled template.
- [ ] Refund template.
- [ ] Ready email fallback if SMS is unavailable.
- [ ] Account verification template.
- [ ] Password reset template.
- [ ] Contact inquiry confirmation.
- [ ] Employment application receipt.
- [ ] Internal failed-order/POS alert.
- [ ] Prevent duplicate sends with notification records.

## Ready SMS

- [ ] Send only after Ready is authoritative.
- [ ] Include Deaf Shark name, order number, and pickup instruction.
- [ ] Avoid sensitive order details.
- [ ] Send once; record provider message ID and status.
- [ ] Handle delivery failures and fall back to email/dashboard.
- [ ] Do not use transactional consent for marketing texts.

## Newsletter

- [ ] Replace fake success behavior with a real API endpoint.
- [ ] Add explicit marketing consent language.
- [ ] Add double opt-in or the approved opt-in method.
- [ ] Store provider contact ID and consent proof.
- [ ] Add unsubscribe and preference-management links.
- [ ] Add bot protection and rate limiting.
- [ ] Do not promise a birthday reward until the rule is approved.

## Contact form

- [ ] Add fields: name, email, phone optional, topic, message.
- [ ] Add catering/general inquiry selection if desired.
- [ ] Save inquiry in D1.
- [ ] Send staff notification and customer receipt.
- [ ] Add dashboard status: New, In Progress, Closed, Spam.
- [ ] Add Turnstile, rate limiting, validation, and maximum lengths.
- [ ] Publish response-time expectations.

## Employment form

- [ ] Add a real submission API.
- [ ] Save application metadata in D1.
- [ ] Upload resumes privately to R2.
- [ ] Restrict file type and size and scan/validate uploads.
- [ ] Send applicant receipt and staff notification.
- [ ] Add private applicant review page or safe export.
- [ ] Add status: New, Reviewing, Interview, Rejected, Hired, Archived.
- [ ] Add retention/deletion policy and authorized access.
- [ ] Remove the current false “Application received” state unless persistence succeeds.

# Section G — Loyalty program

- [ ] Approve earning and redemption rules.
- [ ] Implement a transaction ledger as the source of truth.
- [ ] Award points only once after a qualifying final sale/payment.
- [ ] Reverse points on refunds and cancellations.
- [ ] Implement rewards and redemption.
- [ ] Prevent negative balances and duplicate redemption.
- [ ] Show available rewards, transaction history, and next reward clearly.
- [ ] Add owner adjustment controls with reason and audit log.
- [ ] Decide how the customer's phone identifies them in store.
- [ ] Integrate with Quantic loyalty or postpone cross-channel redemption.
- [ ] Do not advertise unusable rewards at launch.

# Section H — Legal, privacy, accessibility, and customer trust

- [ ] Privacy Policy covering accounts, orders, phone numbers, texts, email, loyalty, analytics, job applicants, and service providers.
- [ ] Terms of Use / Online Ordering Terms.
- [ ] Refund and substitution language is published; cancellation, no-show, uncollected-order, and final pickup language remain pending.
- [ ] SMS consent and messaging terms.
- [ ] Marketing email consent and unsubscribe process.
- [ ] Job-applicant privacy and retention notice.
- [ ] Cookie/analytics disclosure and consent behavior as applicable.
- [ ] Accessibility statement and contact method.
- [x] Allergen and cross-contact notice approved by the business and published.
- [ ] Copyright and photo permissions.
- [ ] Confirm NJ tax treatment with the business's accountant or qualified tax professional.
- [ ] Review whether any card surcharge/online processing fee is permitted before displaying it.
- [ ] Publish business identity, address, phone, support email, and hours.

# Section I — Quality assurance and store operations

## Functional tests

- [ ] Create email account; verify; sign in; sign out; reset password.
- [ ] Google sign-in and account linking.
- [ ] Profile phone save and update.
- [ ] Add every menu category to cart.
- [ ] Test every required modifier and upcharge.
- [ ] Sold-out item disappears/disables immediately.
- [ ] Pause/resume orders.
- [ ] ASAP and scheduled pickup boundary times.
- [ ] Tax and total match server and Stripe/Quantic.
- [ ] Successful, failed, cancelled, duplicated, and refunded payment.
- [ ] Order status changes and customer tracking.
- [ ] Email and SMS each send exactly once.
- [ ] Newsletter signup/confirmation/unsubscribe.
- [ ] Contact inquiry delivery.
- [ ] Employment application with and without resume.
- [ ] Loyalty earn, refund reversal, and redemption.
- [ ] Unauthorized dashboard/API access is rejected.

## Device and store tests

- [ ] iPhone Safari.
- [ ] Android Chrome.
- [ ] iPad/tablet portrait and landscape.
- [ ] Desktop Chrome, Edge, Safari, and Firefox.
- [ ] Exact SUNMI D3 Pro register browser if the site will be opened there.
- [ ] Exact coffee KDS and kitchen KDS workflow.
- [ ] Slow Wi-Fi, dropped Wi-Fi, refresh during checkout, and duplicate taps.
- [ ] Receipt/order number matches all screens.
- [ ] Sound/visual alert works in the noisy shop.
- [ ] Staff can use dashboard controls with touch.
- [ ] Printer behavior if Quantic prints any online order.

## Accessibility and performance

- [ ] Keyboard-only navigation.
- [ ] Visible focus states.
- [ ] Screen-reader names and error announcements.
- [ ] Color contrast.
- [ ] 200% zoom.
- [ ] Reduced-motion behavior.
- [ ] Touch target sizes.
- [ ] Image alt text.
- [ ] Form errors tied to fields.
- [ ] Compress large videos/images and verify mobile loading.
- [ ] Run performance and accessibility audit on production.

## Operational preparation

- [ ] Write a one-page staff order workflow.
- [ ] Train at least two staff members.
- [ ] Define who handles refunds, failed orders, and customer calls.
- [ ] Post emergency contacts for Quantic, Stripe, Cloudflare, Twilio, and Vinny.
- [ ] Document manual outage procedure.
- [ ] Run a full live rehearsal during business hours.
- [ ] Keep a launch-day rollback switch that pauses online ordering without taking the website down.

# Section J — Date-by-date plan to September 1

## August 23 — Ownership and critical requests

- [ ] Owner creates/confirms Cloudflare, Stripe, business email, Twilio, Google, Apple, and Google Play accounts.
- [ ] Owner gives Vinny role-based invitations.
- [ ] Submit Quantic integration/eCommerce/KDS support request.
- [ ] Submit Twilio A2P or toll-free verification immediately.
- [ ] Begin Apple organization enrollment and D-U-N-S lookup.
- [ ] Begin Google Play Organization enrollment and D-U-N-S verification.
- [ ] Collect business legal/banking/domain information privately.
- [ ] Freeze owner decisions needed for menu, hours, taxes, payments, loyalty, forms, and policies.

## August 24 — Production infrastructure

- [ ] Create production/staging Cloudflare deployment, D1, R2, secrets, domain plan, and backups.
- [ ] Verify transactional email domain.
- [ ] Configure Google OAuth project.
- [ ] Create staff-role design and owner admin account.
- [ ] Choose marketing platform.

## August 25 — Security and real forms

- [ ] Protect dashboard and mutation APIs.
- [ ] Complete verification/reset email flows.
- [ ] Implement working newsletter, contact, and employment APIs.
- [ ] Add private resume storage and Turnstile.
- [ ] Add rate limiting, validation, consent records, and staff notifications.

## August 26 — Menu database and admin

- [ ] Import the final approved menu into database-backed structures.
- [ ] Add categories, products, prices, modifiers, photos, tax classes, stations, and availability controls.
- [ ] Complete owner/staff menu management.
- [ ] Verify fridge inventory names/flavors/prices.

## August 27 — Payments and order reliability

- [ ] Complete Stripe test-mode flow if Stripe is the approved processor.
- [ ] Add verified webhooks, idempotency, refunds, notification log, and payment records.
- [ ] Finish checkout consent and policy acceptance.
- [ ] Complete customer transactional emails.

## August 28 — Quantic/KDS integration cutoff

- [ ] Complete Quantic-approved integration and mapping if access has arrived.
- [ ] Run coffee-only, kitchen-only, and mixed-order tests.
- [ ] If Quantic cannot be completed, owner chooses and approves the documented fallback that day.
- [ ] Remove any customer promise that is not technically true.

## August 29 — Full-system testing

- [ ] Test all customer, staff, payment, form, email, SMS, loyalty, and order paths in staging.
- [ ] Test exact store network and hardware.
- [ ] Fix severity-one and severity-two defects.
- [ ] Confirm legal pages and business copy.

## August 30 — Production rehearsal

- [ ] Deploy production candidate to the real domain or a protected production hostname.
- [ ] Run live low-value card payment and refund.
- [ ] Run real order through final staff workflow.
- [ ] Validate email deliverability and SMS approval/status.
- [ ] Train staff and rehearse outage fallback.

## August 31 — Launch freeze

- [ ] Freeze menu and production code except launch-blocking fixes.
- [ ] Export/backup production database.
- [ ] Confirm domain, TLS, monitoring, analytics, redirects, and search metadata.
- [ ] Confirm owner and staff logins.
- [ ] Confirm support contacts and rollback/pause switch.
- [ ] Schedule launch-day monitoring.

## September 1 — Launch day

- [ ] Verify store open state, inventory, wait time, and staff readiness before enabling orders.
- [ ] Place one live opening test order.
- [ ] Monitor orders, payments, Quantic/KDS delivery, form delivery, email, SMS, and errors.
- [ ] Keep Vinny and owner available during the first ordering period.
- [ ] Pause online ordering immediately if payment or POS delivery becomes unreliable.
- [ ] Record all launch issues and fix only high-impact problems during service.

# Section K — Launch acceptance criteria

The full system is ready only when every statement below is true:

- [ ] Deaf Shark owns all production accounts and can remove developer access without losing the system.
- [ ] The public domain loads securely and the owner-approved site is visible.
- [ ] Menu, prices, hours, tax, and availability are accurate.
- [ ] Customers can create/recover accounts and Google/email sign-in works.
- [ ] Staff dashboard and APIs reject unauthorized users.
- [ ] A real payment or explicitly approved pay-at-pickup flow works end to end.
- [ ] Every accepted online order reaches the approved staff workflow exactly once.
- [ ] Coffee and kitchen items route correctly.
- [ ] Customers receive confirmation and Ready communication through the approved channels.
- [ ] Newsletter, contact, and employment submissions are actually stored/delivered.
- [ ] Resumes are private and restricted.
- [ ] Loyalty claims shown to customers are usable and owner-approved.
- [ ] Privacy, terms, refund, SMS, applicant, and allergen language is published.
- [ ] Backups, monitoring, outage procedures, and rollback controls have been tested.
- [ ] Staff completed a live rehearsal and know the fallback workflow.

# Official setup references

- Cloudflare account members: https://developers.cloudflare.com/fundamentals/manage-members/manage/
- Cloudflare Email Service pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Cloudflare Turnstile server validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Stripe account activation: https://docs.stripe.com/get-started/account
- Twilio A2P 10DLC: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc
- Twilio registration quickstart and current review estimate: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart
- Resend domain verification: https://resend.com/docs/dashboard/domains/introduction
- Mailchimp opt-in settings: https://mailchimp.com/help/set-signup-preferences/
- Apple organization enrollment: https://developer.apple.com/programs/enroll/
- Google Play Console enrollment: https://support.google.com/googleplay/android-developer/answer/6112435
- Quantic Ecommerce Express: https://getquantic.com/support/ecommerce-express/
- Quantic KDS: https://getquantic.com/support/customer-product/kds-login-screen/
