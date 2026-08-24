# Open-source implementation references

These projects are design and implementation references for Deaf Shark Coffee. Their complete source trees are intentionally **not vendored into the application**: they are separate products with conflicting databases, authentication systems, servers, and deployment requirements. Copying them wholesale would increase the production attack surface and make upgrades much harder.

When a specific implementation is adapted, preserve the source project's license notice, record the exact file and commit, review the dependency licenses, and add a focused test in this repository.

## Loyalty lifecycle and ledger

- Project: [Loyalty Interchange Protocol](https://github.com/craveup/opensource-loyalty)
- Reviewed commit: `fbbcc68e7637414d271c88d0f35a03febac15fb3`
- License: Apache-2.0
- Use for: idempotent point accrual, reservation/capture/reversal concepts, refund-safe ledger behavior, conformance test ideas.
- Do not import: its separate HTTP service, SQLite/Postgres runtime, Docker stack, or customer-auth assumptions.

## Loyalty account experience

- Project: [Stampee](https://github.com/danlim26/stampee)
- Reviewed commit: `169be021e747308cac39365f85f72273e6e318ca`
- License: MIT
- Use for: mobile reward-card presentation, campaign progress, and simple staff/customer flows.
- Do not import: its Supabase authentication, database, storage, or deployment configuration.

## Promotions, coupons, and gift cards

- Project: [OfferKit](https://github.com/offerkit/offerkit)
- Reviewed commit: `2f04d33c4af62c9b9f8851044fe6645b44456f54`
- License: MIT
- Use for: future promotion rules, coupon status modeling, gift-card ledgers, audit trails, and redemption safeguards.
- Do not import: its Postgres, Redis, queue, Docker, or separate application stack.

## Kitchen display workflow

- Project: [AuraOS](https://github.com/Parwaiz-Dev/AuraOS)
- Reviewed commit: `ed2a23399cf9c419467708da48af33255708135a`
- License: MIT
- Use for: preparation-state names, item-level completion, late-order alerts, full-screen KDS layout, and real-time coordination ideas.
- Do not import: its Express/Postgres/Socket.IO POS platform.

## Stripe payment flow

- Project: [Next.js Stripe TypeScript example](https://github.com/vercel/next.js/tree/canary/examples/with-stripe-typescript)
- Reviewed repository commit: `7d29e358c8ac383a3019d552fd54f4d05645bf39`
- Use for: client/server separation, PaymentIntent or Checkout flow, webhook-driven confirmation, and test scenarios.
- Do not import yet: payment packages or routes. Phase One ordering is handled by Genius POS, and production Stripe work requires a Deaf Shark-owned account and a fresh review of Stripe and Cloudflare compatibility.

## Current Deaf Shark implementation decision

The application remains one Cloudflare-native codebase:

- D1 is the source of truth for customers, points, offers, orders, and administrative records.
- Better Auth owns public customer sessions.
- R2 stores business-uploaded media.
- The welcome program grants 25 points once per member and issues one unique in-store half-off coffee offer.
- Staff redeem the offer from the protected loyalty dashboard, producing a durable redemption record.
- Purchase-based points remain separate from the signup benefit until Genius POS transaction integration is confirmed.

