# Launch runbook

This runbook covers the work the project team can prepare before business-owned accounts are connected, plus the exact release gates to use once those accounts are available.

## Release gates

Run these from the repository root against the exact commit intended for release:

```powershell
npm ci
npm run lint
npm test
npm run assets:audit
npm run launch:check
```

`launch:check` reads `.env.local` when present and fails when a production-required value is missing, local, non-HTTPS, or inconsistent. Never put production secrets into a committed file; hosted values belong in Sites/Cloudflare secrets.

The media audit reports assets above the current recommendations (1 MB for images and 5 MB for video). It is informational because some approved owner media currently exceeds those limits. Compress and visually compare reported files before launch; do not replace owner assets blindly.

## Business-owned launch inputs

Do not invent or substitute these values:

- final public domain and Cloudflare account access;
- payment-processor decision and account access, needed only before online prepay work begins;
- at least one business-controlled staff email;
- Turnstile widget keys and approved production hostnames;
- official contact/support and hiring email;
- final hours, prices, refund/cancellation rules, allergy language, and retention decisions;
- Google OAuth, email delivery, or SMS credentials if those optional services are enabled;
- Apple Developer and Google Play organization accounts for the later apps.

Confirmed ownership contacts:

- primary ownership/admin: `admin@deafsharkcoffee.com`;
- off-domain backup ownership/recovery: `miguelmerino@msn.com`.

The backup address is for account recovery and ownership continuity. It is not a form-delivery recipient and must not receive customer messages or job applications unless the owner explicitly changes that decision.

## Database and storage release order

1. Confirm the intended production D1 and R2 resources with the owner.
2. Follow `REMOTE_D1_RECONCILIATION.md` before applying any remote migration.
3. Build the release with `npm run build`.
4. List pending migrations:

   ```powershell
   npx wrangler d1 migrations list DB --remote -c dist/server/wrangler.json
   ```

5. Apply only reviewed pending migrations:

   ```powershell
   npx wrangler d1 migrations apply DB --remote -c dist/server/wrangler.json
   ```

6. Deploy the same build only after migrations succeed.
7. Verify `/api/health`, `/api/readiness`, the home page, menu, authentication, protected staff pages, all public forms, and a real website pickup order reaching `/dashboard` and the station screens.

## Ordering acceptance test

Ordering is first-party and pay at pickup. No card details are collected on this
website, so this test never involves an online payment.

Before announcing launch, use a real customer device and the store's own back-of-house
device:

1. Start from an Order online link on the website and confirm it opens `/menu`.
2. Build an order containing one configurable drink with modifiers and one kitchen item,
   so both station screens receive work.
3. Confirm checkout states that payment is due at pickup and shows the pickup estimate.
4. Submit the order, then press submit again or reload and retry. Confirm only one order
   exists: the idempotency key must collapse the retry onto the first order.
5. Confirm the order appears on `/dashboard` within a few seconds with the correct name,
   order number, ASAP or scheduled label, quantities, modifiers, notes, total, and a
   "Pay at pickup" state.
6. Confirm `/kds/coffee` and `/kds/kitchen` each show only their own items, and that
   accept, ready, and complete transitions behave correctly on both.
7. Toggle Pause online orders and confirm the website blocks new checkouts, then resume.
8. Mark an item sold out and confirm the website refuses to submit that item.
9. Cancel the test order through the dashboard and confirm the state everywhere.
10. Take payment for the real order at the counter as normal.

## Rollback and incident response

- Code regression: stop promotion, preserve logs, and roll back to the last known-good Worker version. Do not run a database down-migration automatically.
- Database issue: pause online ordering from `/dashboard` first, then export the current database and restore only from a verified backup after owner approval.
- Credential exposure: revoke and rotate the credential in the provider dashboard, update the hosted secret, redeploy, and review logs for misuse.
- Account compromise: remove the email from `STAFF_EMAILS`, revoke sessions/provider access, rotate relevant secrets, and preserve an incident timeline.
- Form abuse: keep Turnstile fail-closed, inspect request volume without logging submitted private content, and tighten provider/firewall rules if needed.

## Post-deploy checks

- Desktop and mobile pages render without horizontal overflow or console errors.
- Keyboard focus returns to the product that opened a configurator.
- Anonymous users cannot access dashboard/KDS content or another customer's orders.
- Contact, newsletter, and employment forms accept valid Turnstile challenges and reject invalid ones.
- `robots.txt`, `sitemap.xml`, privacy, terms, support links, and the official business information are correct.
- `/api/health` returns `200` with `Cache-Control: no-store`.
- Security headers include `nosniff`, clickjacking protection, a strict referrer policy, and a restrictive permissions policy.
