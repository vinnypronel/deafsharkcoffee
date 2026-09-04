# Deaf Shark Coffee

Customer website, menu, account area, and staff operations tools for Deaf Shark Coffee in Union, New Jersey. The application is a React 19/vinext full-stack app deployed as a Cloudflare Worker, with D1 for relational data, R2 for staff-uploaded media, and a Cloudflare Images binding for image delivery.

## Current ordering model

Deaf Shark takes pickup orders on its own website. The customer builds an order on
`/menu`, submits it from the site's own checkout, and the order arrives on the
protected staff screens. There is no hosted third-party ordering page in the
customer path.

Phase one is **pay at pickup only**:

- No card details are collected, stored, or transmitted by this website.
- Every order is stored with `payment_method = "pickup"`. Nothing is ever marked paid online.
- Checkout states plainly that payment is due at the counter, and the confirmation repeats it.
- Prices, modifier charges, sales tax, pickup estimate, order source, and station routing
  are all derived on the server. Client-supplied prices, totals, and payment state are ignored.
- Each checkout session generates an idempotency key. A retry or a double-click resolves to
  the order that was already stored instead of creating a second ticket.

Order routing:

- Every generic "Order online" control links to `/menu`.
- Product-specific controls add or configure that exact product in the site's own cart.
- `app/ordering.ts` reads `NEXT_PUBLIC_ORDERING_ENABLED` and exposes `CUSTOM_CHECKOUT_ENABLED`.
- With ordering closed, `/menu` still shows the full menu and prices. Only the cart,
  the add controls, the checkout, and the public order API are withheld.
- `NEXT_PUBLIC_ORDERING_URL` is retained only for a hosted fallback and is unused here.

Online card payment is deliberately **not** built. It requires a separate business-owned
processor decision before any implementation work. See "Online payment is a separate decision".

## Staff order screens

- `/dashboard` is the overall back-of-house order screen: every live website order, pause and
  resume online ordering, sold-out toggles, and status changes.
- `/kds/coffee` and `/kds/kitchen` are station screens that show only that station's items.
- All three refresh about every two seconds and require staff authentication. Order status APIs
  reject anonymous requests.
- There are no active public customer-account controls and no loyalty promise shown to customers.
  The loyalty tables exist in the schema but are not a launch feature.

## Online payment is a separate decision

Before any prepay work begins, the business must decide and provide:

- the processor (for example Stripe or Square) owned by the business;
- account access, refund authority, and settlement details;
- production and test credentials.

The implementation must then use tokenized hosted fields or hosted checkout, verified webhooks,
idempotency, payment and refund records, and reconciliation against the store's own reporting.
Raw card collection on this website is out of scope permanently.

## Prerequisites

- Node.js `>=22.13.0`
- npm
- A Cloudflare account only when testing bound services or deploying

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run build
npm run db:migrate:local
npm run dev
```

Use non-production credentials for local development. `.env*` files are ignored except `.env.example`; never commit secrets.

The site shell and static pages can build without every optional provider. Database-backed APIs require the D1 `DB` binding and all migrations. Public forms intentionally reject submissions until Turnstile is configured.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local vinext development server. |
| `npm run build` | Create the production Worker and static client bundles. |
| `npm run lint` | Run ESLint over application code. |
| `npm test` | Build, then run every `tests/*.test.mjs` test. |
| `npm run launch:check` | Fail closed when required production URLs, secrets, staff emails, or Turnstile hostnames are missing or unsafe. |
| `npm run assets:audit` | Report unusually large public images and videos for visual compression review. |
| `npm run db:generate` | Generate a migration after changing `db/schema.ts`. Review the SQL before applying it. |
| `npm run db:migrate:local` | Build and apply pending D1 migrations to project-local Wrangler state. |
| `npm run deploy` | Build and deploy the Worker. Run remote migrations first; do not use this as the first production step. |

## Database changes

`db/schema.ts` and the ordered SQL files in `drizzle/` are the schema source of truth. Runtime requests never create tables, alter columns, or seed data. `ensureSchema()` performs a read-only readiness check and reports missing migrations.

Development workflow:

1. Change `db/schema.ts`.
2. Run `npm run db:generate`.
3. Review the generated SQL and migration journal.
4. Run `npm run db:migrate:local`.
5. Run `npm test`.

Production workflow after Cloudflare access is available:

1. Back up or confirm D1's migration backup/recovery plan.
2. Build the exact release: `npm run build`.
3. Review pending migrations: `npx wrangler d1 migrations list DB --remote -c dist/server/wrangler.json`.
4. Apply them: `npx wrangler d1 migrations apply DB --remote -c dist/server/wrangler.json`.
5. Only after migrations succeed, deploy the matching Worker release.
6. Verify the menu, authentication, forms, staff dashboard, and ordering handoff.

Remote commands are intentionally not part of the normal test script. They require an authenticated, business-owned Cloudflare account and explicit operator review.

The detailed deployment, ordering acceptance, rollback, and incident procedure is in `docs/LAUNCH_RUNBOOK.md`. If a remote D1 database already contains tables, follow `docs/REMOTE_D1_RECONCILIATION.md` before applying any migration.

## Environment configuration

Use `.env.example` as the complete inventory. Production secrets should be stored as Worker secrets, not as plaintext configuration.

### Needed for launch

- `BETTER_AUTH_SECRET`: strong random Better Auth secret.
- `BETTER_AUTH_URL`: canonical HTTPS application origin.
- `NEXT_PUBLIC_SITE_URL`: canonical origin used by `sitemap.xml` and `robots.txt`.
- `STAFF_EMAILS`: comma-separated, business-controlled administrator addresses allowed into staff tools.
- `CONTACT_EMAILS`, `EMPLOYMENT_EMAILS`, `ADMIN_EMAILS`: separate notification recipients for customer messages, job applications, and operational alerts.
- `SUPPORT_EMAIL`: the public customer-support address.
- `NEXT_PUBLIC_ORDERING_ENABLED`: master switch for the site's own ordering. Must be exactly `true` to open the cart, checkout, and `POST /api/orders`. Anything else keeps ordering closed behind the coming-soon notice while leaving the menu and prices visible. Closed is the default.
- `NEXT_PUBLIC_ORDERING_URL`: legacy hosted-ordering URL. Unused while the site takes its own orders.
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`: end-to-end form abuse protection.

### Optional or account-dependent

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google sign-in after the business's OAuth project and verified domain are ready.
- `CLOUDFLARE_EMAIL_ENABLED`, `AUTH_EMAIL_FROM`: preferred native Cloudflare transactional-email configuration using the `EMAIL` binding.
- `RESEND_API_KEY`: optional fallback sender when Cloudflare Email Service is not enabled.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: order-ready SMS after Twilio and A2P approval. SMS remains inert when these are absent.

## Cloudflare bindings

- `DB`: D1 database containing accounts, website orders, menu state, forms, content, and events.
- `UPLOADS`: R2 bucket for approved staff uploads and employment résumé files.
- `IMAGES`: Cloudflare Images binding used by the Worker image route.

`vite.config.ts` supplies local binding configuration and the build produces `dist/server/wrangler.json`. The real database ID and bucket ownership must be confirmed in the business Cloudflare account before production deployment.

## Security and privacy baseline

- Customer order APIs require a signed-in account and scope reads to that account's user ID.
- Staff APIs require an authenticated email present in `STAFF_EMAILS`.
- Contact, newsletter, and employment submissions require a valid, action-bound Turnstile token in production configuration.
- Résumés and customer/order records contain personal information. Restrict staff access and establish retention/deletion rules before launch.
- `app/privacy/page.tsx` and `app/terms/page.tsx` must match the final provider, refund, allergy, retention, loyalty, and contact decisions and should receive owner/legal review.
- Never log access tokens, authentication secrets, full payment data, or résumé contents.

## Account-dependent launch work

The code can be prepared locally, but these connections require business-owned accounts or decisions:

- Payment-processor decision and account access before any online prepay work
- Cloudflare domain, DNS, D1, R2, Images, and production secret access
- Official support/sending email and email-provider account
- Turnstile widget credentials and production hostnames
- Google OAuth project and verified domain
- Twilio number, A2P campaign, and consent language
- Final menu, prices, hours, tax, refund, allergy, loyalty, and data-retention policies
- Apple Developer and Google Play organization accounts for the later mobile apps

## Pre-launch verification

1. `npm run lint`
2. `npm test`
3. Confirm `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` use the final HTTPS origins.
4. Confirm every D1 migration is applied before deployment.
5. Test ownership boundaries with two separate customer accounts.
6. Test contact, newsletter, and employment forms with production Turnstile hostnames.
7. Test staff sign-in and revoke access for any obsolete address.
8. Place a real pickup order on the production site and confirm it reaches `/dashboard`, the correct station screen, and the store's back-of-house device.
9. Verify `robots.txt`, `sitemap.xml`, privacy, terms, support contact, mobile layouts, and accessibility.

## Project layout

- `app/`: pages, APIs, customer storefront, account UI, dashboard, and KDS screens
- `db/`: Drizzle schema and D1 access
- `drizzle/`: ordered D1 migrations
- `lib/`: authentication, authorization, forms, SMS, hours, and supporting services
- `worker/`: Cloudflare Worker entry point and image route
- `tests/`: build-backed rendered tests and focused authorization tests
- `public/`: production media and static assets

References: [Cloudflare Workers](https://developers.cloudflare.com/workers/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Drizzle D1](https://orm.drizzle.team/docs/get-started/d1-new), and [vinext](https://github.com/cloudflare/vinext).
