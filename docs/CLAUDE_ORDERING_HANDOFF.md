# Claude handoff: finish Deaf Shark's first-party ordering system

You are continuing work in this existing repository:

`C:\Users\vinny\OneDrive\Desktop\Deaf-Shark-Coffee`

## Objective

Finish and validate Deaf Shark Coffee's own online-ordering system. The restaurant no longer wants to use the Heartland/Genius hosted ordering page. Customers should build and submit pickup orders on the Deaf Shark website, and staff should receive them on a separate protected back-of-house screen.

The safe first release is **pay at pickup only**. Do not collect card numbers, simulate successful card payments, or label an order paid. A future online-payment phase must use a business-owned payment processor and tokenized hosted fields or checkout.

## Important repository rules

- The worktree is intentionally very dirty and contains many user changes. Inspect `git status` first.
- Do not reset, revert, clean, delete, or overwrite unrelated files.
- Do not deploy or mutate remote Cloudflare resources unless the user explicitly authorizes it after reviewing the target account and resource IDs.
- Do not apply the repository's migrations to the current remote D1 database. Its tables and migration ledger are known to be inconsistent. Follow `docs/REMOTE_D1_RECONCILIATION.md` first.
- Never put secrets in `vite.config.ts`, committed files, generated `dist/server/wrangler.json`, or ordinary Wrangler `vars`.
- `.dev.vars` is ignored and currently contains Cloudflare's public local Turnstile test credentials only.
- Preserve the removal of public customer-login controls. Staff authentication is still required for dashboard/KDS routes.

## Work already completed

- `app/ordering.ts` now enables `CUSTOM_CHECKOUT_ENABLED` and uses integrated mode.
- Heartland is no longer the active customer ordering destination.
- `app/order-online-link.tsx` routes generic order links to `/menu` in integrated mode.
- Menu items, configurable products, quick-add controls, cart drawer, checkout, and confirmation UI already exist in `app/storefront.tsx`.
- Checkout is pay-at-pickup only; the unsafe `Card payment demo` choice was removed.
- Guest customers can place pay-at-pickup orders without creating an account.
- Checkout sends name, phone, fulfillment choice, selected items, and a Turnstile token to `/api/orders`.
- `app/api/orders/route.ts` reprices products on the server, validates availability and quantities, calculates New Jersey sales tax, verifies the `order` Turnstile action, and stores orders in D1.
- Order payloads have body-size, item-count, total-quantity, name, and phone limits.
- The staff dashboard at `/dashboard` already shows all live website orders and supports pause/resume and status changes.
- Dedicated protected station screens already exist at `/kds/coffee` and `/kds/kitchen`. They refresh automatically, split items by prep station, support status changes, and can play a new-order sound after staff enable audio.
- Order status updates are protected by staff authentication.
- The generated Worker configuration is guarded against plaintext `vars`, wrong D1/R2 resources, and local production routes.
- Local D1 migrations were successfully applied to `.wrangler/state`.
- TypeScript passes.
- Production build passes.
- All 22 Node tests pass.
- ESLint passes with warnings only; the remaining warnings are mostly existing `<img>` optimization notices.

## Immediate tasks, in order

### 1. Audit the current diff

Inspect all ordering-related changes before editing:

```powershell
git status --short
git diff -- app/ordering.ts app/order-online-link.tsx app/storefront.tsx app/api/orders/route.ts app/api/orders/[id]/route.ts app/dashboard app/kds app/turnstile-widget.tsx lib/public-form.ts db/schema.ts
```

Use `Get-Content -LiteralPath` for paths containing `[id]` or `[station]` in PowerShell.

### 2. Finish the customer ordering flow

Test every order entry point. All generic Order online links should open `/menu`, while product-specific controls should customize or add that exact product to the internal cart. There must be no customer-facing Heartland redirect or coming-soon popup in integrated mode.

Verify:

- configurable and non-configurable items;
- quantity changes, editing, and removal;
- sold-out products cannot be submitted;
- prices and modifiers are recomputed by the server;
- cart remains usable on desktop and mobile;
- checkout clearly says payment is due at pickup;
- double-clicking submit cannot create duplicate orders;
- stale menu/availability changes return a helpful message;
- confirmation displays the order number and pickup estimate;
- no promise of SMS is shown unless SMS is actually configured.

Add an idempotency key generated when checkout opens and enforce uniqueness server-side so retries cannot create duplicate orders. This will probably require a reviewed D1 migration and tests. Do not touch remote D1.

### 3. Harden the public order API

Review `app/api/orders/route.ts` for:

- clean 400/409 responses for bad customer input, unknown products, sold-out products, closed ordering, and invalid pickup times instead of generic 500 responses;
- strict modifier validation and maximum special-instruction length;
- rejection of non-JSON requests;
- Turnstile verification before database work;
- privacy-safe structured logs that do not contain names, phone numbers, order contents, or tokens;
- an internal order reference in logs;
- server-derived prices, tax, payment state, source, and station assignment;
- no trust in client-provided totals, names, prices, or payment status.

Add focused tests for these rules where practical.

### 4. Validate the staff order screens

The overall back-of-house order screen is `/dashboard`. The station-specific screens are `/kds/coffee` and `/kds/kitchen`.

Verify on the device-sized layouts that staff can:

- see new orders within a few seconds;
- distinguish ASAP and scheduled orders;
- see customer name, order number, payment-due state, modifiers, notes, quantities, and pickup estimate;
- accept/start, mark ready, complete, and cancel correctly;
- use Pause online orders and sold-out controls;
- reconnect cleanly after losing network access;
- enable an audible alert with an obvious persistent on/off state;
- keep the page usable in full-screen mode without screen overflow.

Check whether one overall screen is enough for the store. Do not remove the station screens unless the user requests it.

### 5. Complete local end-to-end testing

Build and run the Worker runtime, not `vinext start`, because the plain Node start command cannot load `cloudflare:` modules:

```powershell
npm run build
npm run db:migrate:local
npx wrangler dev -c dist/server/wrangler.json --port 8787 --persist-to .wrangler/state
```

Then use Chrome DevTools against `http://localhost:8787` at desktop and mobile widths. Create a real local test order and verify the D1 row. To test authenticated staff screens, configure a local staff login through ignored local secrets; never weaken the production authorization checks.

The previous browser pass was interrupted shortly after opening `/menu`, so browser validation is not complete.

### 6. Update stale documentation

The README, `docs/LAUNCH_RUNBOOK.md`, `docs/HEARTLAND_ORDERING_LOYALTY.md`, `.env.example`, and the master checklist still contain hosted-ordering assumptions. Rewrite them to reflect:

- first-party website ordering;
- pay at pickup for phase one;
- no active public customer accounts or loyalty promises;
- protected staff dashboard/KDS;
- future online payments require a separate business-owned processor;
- Heartland documentation is historical only and not the launch architecture.

Do not delete useful historical integration research; label it superseded.

### 7. Production work that remains blocked on business-owned access

Do not claim production readiness until all of these are complete:

- Cloudflare business-account invitation for `admin@deafsharkcoffee.com` with `miguelmerino@msn.com` as the off-domain backup/recovery address;
- explicit production Worker, D1, and R2 IDs;
- remote D1 backup and schema/migration reconciliation;
- production Turnstile widget and secret for the real domain;
- staff sign-in delivery/provider configuration;
- email routing to `contact@deafsharkcoffee.com`, `employment@deafsharkcoffee.com`, and `admin@deafsharkcoffee.com`;
- `help@deafsharkcoffee.com` as public support;
- custom domain, canonical URL, sitemap, and robots verification;
- monitoring, backups, alerting, and a rehearsed rollback;
- real in-store acceptance test on the back-of-house device.

## Payment boundary

Do not build raw card collection. If the user wants customers to prepay, stop before implementation and get a decision on a business-owned processor such as Stripe or Square, plus account access, refund authority, settlement details, and production/test credentials. The proper design must use tokenized payment components, verified webhooks, idempotency, payment/refund records, and reconciliation.

## Required validation before handoff

Run these sequentially; do not run concurrent builds because Windows/OneDrive can lock `dist`:

```powershell
npx tsc --noEmit
npm run lint
npm run build
node --test tests/*.test.mjs
npm run worker:config:check
npm run release:smoke -- http://localhost:8787
```

Also verify:

- no external Heartland ordering links remain active;
- no `Card payment demo`, fake paid state, or public loyalty claim remains;
- `/api/health` and `/api/readiness` are non-cacheable and successful in the Worker runtime;
- `/dashboard`, `/kds/coffee`, `/kds/kitchen`, and order status APIs reject anonymous access;
- generated Worker configuration contains no secrets or localhost production routes;
- desktop and mobile have no horizontal overflow or serious console errors.

Finish with a concise report separating:

1. completed and tested locally;
2. remaining production-account tasks;
3. the exact business decision needed for online card payment.
