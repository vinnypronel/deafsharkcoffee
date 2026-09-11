# September 11 launch preparation

Checked September 10, 2026. This is an in-progress launch assessment, not production sign-off.

## Confirmed live state

- `https://deafsharkcoffee.com/api/health`: HTTP 200.
- `/api/readiness`: HTTP 200; this checks table presence only, not complete ordering readiness.
- `/api/auth-config`: Google, email signup, verification, and recovery are all disabled.
- `/api/turnstile-config`: a production site key is present and reports configured. End-to-end challenge verification still needs testing.
- Existing checkout is first-party pay at pickup. Stripe is not installed or connected.
- The saved Sites project is a separate private demo. Do not treat its URL or database as the customer production domain.

## Owner decisions pending

Miguel is being asked to choose signup benefit, earning rules, reward value/threshold, eligible items, online/in-store scope and current POS, redemption restrictions, expiration, and birthday perks. The user explicitly requested changing the earlier rewards; the old values are not approved for this launch.

Confirm guest checkout and whether both online payment and pay at pickup should be offered. The user wants a small processing fee, but no amount or compliant implementation has been agreed.

## Account setup required

- Business-owned Stripe account, business representative verification, settlement account, test/live API access, webhook signing secret, and staff refund authority.
- A working transactional email sender for verification and password recovery. A mailbox alone does not configure the application's sending service.
- Production staff login and actual store-device acceptance test.

Never paste secrets into this document or chat. Store them in the appropriate secret settings. Read `docs/REMOTE_D1_RECONCILIATION.md` before remote migration work.

## Reliability changes prepared locally

- Complete an order and award its points in one database batch, with replay protection and rollback.
- Reject stale station updates rather than overwrite another station's progress.
- Prevent completed/cancelled orders from reopening without a refund/reversal workflow.
- Keep account/search dialogs open when customers type spaces or press Enter.
- Restrict post-login return paths to this origin; report failed signout/profile updates.
- Mark API and staff responses non-cacheable.
- Correct the launch checker for first-party ordering and reject Turnstile test credentials.
- Correct keyboard semantics for the unavailable ordering control and newsletter form.

No production settings, rewards, database, or deployment were changed by this preparation pass.

Validation: TypeScript, final production build, all 55 Node tests, generated Worker configuration check, and lint on changed code passed. The full lint run initially found two accessibility errors; both were fixed and rechecked. Existing image-optimization warnings remain. The transaction tests exercise SQLite rollback, duplicate credits, insufficient balances, and stale updates. A separate Miniflare D1 probe did not complete and was stopped; full Worker-runtime and customer browser acceptance remain unverified. The Sites build wrapper failed to locate npm on Windows; the project's normal `npm run build` completed successfully.

## Launch decision (September 10)

- Launch mode A: signed-in, verified accounts only, pay at pickup. Guests see a sign-in prompt in checkout. Guest checkout opens once Stripe online payment is live.
- Loyalty stays off (`LOYALTY_ENABLED` unset). Orders still store `customer_user_id` and totals, so points can be credited retroactively once Miguel sets the rules.
- Cart persists in localStorage for 12 hours so it survives sign-in and email verification.

## Launch-day switches

1. Resend: verify deafsharkcoffee.com, then set Worker secrets `RESEND_API_KEY` and `AUTH_EMAIL_FROM` (e.g. `Deaf Shark Coffee <account@deafsharkcoffee.com>`).
2. Set `NEXT_PUBLIC_ORDERING_ENABLED=true` in `.env.production` before the release build. It is a build-time value.
3. Deploy, create a real account, verify the email, place one order, and confirm it reaches the store screens.
4. Apply migration `0017_store_weekly_hours.sql` to remote D1 (follow `docs/REMOTE_D1_RECONCILIATION.md`, back up first). Until it runs, the site shows the default hours and the dashboard Hours tab reports that the database update is needed; nothing else breaks.
5. Log into the dashboard, open Hours, confirm the week, and save once.

## Payment implementation to complete after account setup

1. Add server-created Stripe Checkout sessions using server-priced totals, a stored pending payment, and idempotency keys.
2. Keep unpaid attempts out of kitchen/staff preparation queues.
3. Verify webhook signatures and check currency, amount, merchant mode, and stored order linkage before marking payment successful. A browser success redirect is not payment proof.
4. Handle expired/cancelled checkout, duplicate/out-of-order webhook deliveries, refunds, and points reversals with durable records.
5. Add a clearly disclosed surcharge only after processor/network approval and exact cost rules are known. Credit/debit detection is required; a flat charge on all online cards is not an acceptable shortcut.
6. Test declined cards, abandoned payment, replayed webhooks, successful payment, receipt, refund, and real store routing before switching on production payments.

References: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe account activation](https://docs.stripe.com/get-started/account), [NJ credit-card surcharge FAQ](https://www.nj.gov/oag/newsreleases23/2023-1219_credit-card-surcharges-faq.pdf), [Stripe surcharge guidance](https://stripe.com/resources/more/credit-card-surcharges-explained-what-businesses-need-to-know).
