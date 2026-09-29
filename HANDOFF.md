# Deaf Shark Coffee handoff (2026-09-29)

## 1. Task
Launch online pickup ordering and customer accounts on deafsharkcoffee.com (vinext/Next.js on Cloudflare Workers, D1 database, repo github.com/vinnypronel/deafsharkcoffee). Pay at pickup only for now; Stripe later. Goal: owner and staff run orders from the dashboard tablet with no missed orders, then announce publicly (planned for the morning of 2026-09-30).

## 2. State
DONE and live (last commit dd2587d, pushed and deployed, 95/95 tests pass):
- Ordering + sign-up ON. Sign-up reward = one 50% off one drink coupon, issued at account creation (lib/welcome-offer.ts via better-auth databaseHooks in lib/auth.ts), never expires, one per account, used once at checkout, returned if the order is cancelled. All 13 accounts have one.
- New-order alert emails go to admin@deafsharkcoffee.com only (Worker secret ADMIN_EMAILS). Dashboard access (STAFF_EMAILS): admin@, webdev@deafsharkcoffee.com, pronelweb@gmail.com, miguelmerino@msn.com, all verified.
- Dashboard: Orders / Website switch; Orders tabs = Live orders, Available today, Order history, Customers, Promotions. Available today marks items and ingredients out (out choices greyed for customers, removable ingredients auto "No X" on the ticket, server refuses out choices).
- Timed pause (migration 0022 applied to prod): staff pick 15/30/45/60/90/120 min or until resumed; customers see a live countdown on the item sheet, cart, checkout. Files: lib/pause-state.ts, app/pause-notice.tsx.
- Sound: red bar whenever browser audio is not running, iOS silent switch bypass (audioSession "playback"), Test sound button. Page cannot read device volume (browser limit).
- Mobile, tablet (portrait gets phone-style hero and pinned menu card) and dashboard layout fixes; hero video uses cropped mobile frames (public/hero-frames-v4/mobile).
- 7 early orders (placed while ordering should have been closed) cancelled; the 5 real customers were emailed.
IN PROGRESS: nothing half-edited. HANDOFF.md and legal/ are untracked on purpose.
NOT STARTED: Stripe, Google sign-in, Twilio texts, attorney-approved Terms/Privacy (drafts in legal/), per-item order limit change, launch promo.

## 3. Key decisions (do not re-litigate)
- Pay at pickup for everyone until Stripe. Stripe plan: Embedded Checkout plus a flat "Online ordering fee" line, NOT a card surcharge.
- Sign-up reward is the coupon only; everyone starts at 0 points. Points 1 per $1; 50 pts = $3, 100 pts = $7. Referral 25 pts (max 10 per 30 days). Birthday free drink up to $8 in store. Kean student 10%. One discount per order.
- Wait time defaults to 15 min; staff change it on the dashboard. Shop uses one shared login on the counter tablet.
- Order alerts: admin@ only (not webdev@).

## 4. Landmines
- Vinny's rules: never use em dashes or emojis anywhere; never push unless he says push in that message; no AI co-author trailer on commits; npm not pnpm; never put runnable placeholder emails in instructions (he ran example.com ones verbatim once).
- .env.production is untracked and holds the ordering/accounts flags (baked in at build). Check `node scripts/launch-switch.mjs status` before deploying. Worker secrets (ADMIN_EMAILS, STAFF_EMAILS, RESEND, etc.) are not changed by editing that file; use the script's notify/staff modes.
- Deploy = `npm run deploy` (not Vercel). Apply remote D1 migrations BEFORE deploying code that needs them: `npx wrangler d1 migrations apply DB --remote -c dist/server/wrangler.json` after a build.
- app/globals.css mixes CRLF and LF lines; scripted edits must keep line endings or the diff balloons.
- Local dev DB: several sqlite files under .wrangler/state; the dev server's was behind on migrations (fixed). Staff dashboard cannot be viewed locally without a staff login.
- Passwords are hashed; they cannot be looked up. Use Forgot password or give the owner her own login (add her email with the staff command).
- Built-in browser screenshots only render the top of the page; verify lower sections by measuring.

## 5. Next steps
1. At the shop, place ONE real test order from Vinny's phone: tablet chimes, admin@ email arrives, move it New to Preparing to Ready to Complete, points appear. Nothing has gone through live yet.
2. Tablet: signed in (admin@ or owner's own account), dashboard open, tap once, press Test sound with the silent switch on, volume up, screen never sleeps, plugged in.
3. Try Available today (mark Oat out, check phone, mark back in) and a 15 min pause (countdown on phone, then Resume).
4. Show staff: New, Preparing, Ready, Complete when paid; cancel only for no-show or request; Pause; wait time; Customers for in-store coupon redemption.
5. Ask the owner (sheet: https://claude.ai/artifact/TdKSTp79rEZoQgYcGTn9SM):
   a. No-shows: what staff do with the item; block repeat no-shows? (blocking is new work)
   b. Launch promotion (double points, flat bonus, product bonus, visit challenge; set in Promotions)?
   c. Max of one item per online order (now 99; change ORDER_MAX_ITEM_QUANTITY in lib/order-intake.ts and MAX_PER_ITEM in app/storefront.tsx)?
   d. Holidays or special closures (set in Website > Hours)?
   e. Who owns the tablet login password and the admin@ inbox? Does she want her own login?
6. Apply her answers, deploy, then announce launch.
7. Later: Stripe (owners create account, invite webdev@, build in test mode); Google sign-in (OAuth client, redirect https://deafsharkcoffee.com/api/auth/callback/google, secrets GOOGLE_CLIENT_ID/SECRET, first make Google sign-ups follow the accounts switch); Twilio texts (10DLC approval 1 to 3 weeks, set NEXT_PUBLIC_ORDER_READY_SMS_ENABLED=true after); attorney sign-off on legal/ drafts.

## 6. How to operate
- `node scripts/launch-switch.mjs status | open | close` (open/close rebuild and deploy)
- `node scripts/launch-switch.mjs notify a@x.com` (order alert emails) and `staff a@x.com,b@y.com` (full staff list; live immediately)
- Emergency off: `node scripts/launch-switch.mjs close` (accounts untouched)
- Check orders: `npx wrangler d1 execute deaf-shark-coffee --remote --command "SELECT order_number, customer_name, status FROM orders ORDER BY id DESC LIMIT 10"`
- Tests: `npm test` (builds first). Typecheck: `npx tsc --noEmit -p .`
