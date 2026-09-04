# Heartland ordering and loyalty integration

> **Superseded, historical only.** As of September 2, 2026 the restaurant takes
> pickup orders on its own website. Heartland/Genius is not the launch ordering
> architecture, the hosted ordering page is not in the customer path, and no
> loyalty program is promised to customers. This document is kept because the
> integration research and the activation constraints below stay useful if the
> business later revisits a POS-hosted or POS-synced model. Nothing here
> describes current behavior. See the README's "Current ordering model" and
> `docs/LAUNCH_RUNBOOK.md`.

## Production decision

Heartland Restaurant/Genius is the system of record for hosted orders, customer
ordering accounts, payments, and loyalty. The website must not independently
award points for hosted orders or ask customers to maintain a second rewards
identity.

The public ordering URL is:

`https://deafsharkcoffee.hrpos.heartland.us/menu`

The URL is configured locally, but the website launch switch must remain off
until the Heartland location itself accepts orders. As of September 2, 2026,
the hosted page reports that online ordering is disabled and all items are
unavailable.

## Heartland activation gate

In the Heartland Restaurant Admin Portal, verify all of the following:

1. Open the correct account and location, then go to **Location Setup > Online Ordering**.
2. Assign an online iPad and confirm that device is online.
3. Set Carryout to **Supported** and **Active**.
4. Set the accepted payment type to **Credit** or **Both**.
5. Confirm menu items, modifiers, prices, taxes, lead time, tips, and hours.
6. Place one paid test order from the Deaf Shark website link.
7. Confirm that the ticket reaches the correct location and kitchen workflow.
8. Refund the test order and verify the customer receives the refund.
9. Set `NEXT_PUBLIC_ORDERING_ENABLED=true` in the production build environment and redeploy.

The website retains this environment switch as an immediate rollback control.

## Customer accounts and loyalty

The Genius ordering site provides customer registration using first name, last
name, email, mobile number, and password. Its account interface advertises past
orders, favorites, saved information, and loyalty-point collection. Heartland
also markets Heartland Loyalty as an integrated program powered by Como.

Before displaying a balance on the Deaf Shark website, the Heartland account
representative or integration team must confirm:

1. Is Heartland Loyalty/Como enabled for Deaf Shark Coffee's account and Union location?
2. Does registration on the hosted ordering site automatically enroll or identify a loyalty member?
3. Are online and in-store purchases credited to the same member when email or mobile number matches?
4. Where can customers see their balance, rewards, and activity?
5. Can the hosted account page be opened through a supported direct link?
6. Which official API supports members, balances, rewards, tickets, and order history?
7. Are webhooks available for completed, refunded, voided, or adjusted orders?
8. What merchant API-key scopes and partner approval are required?
9. What is the stable external member identifier, and can records be matched by verified phone or email?
10. Which loyalty actions may the website perform: read balance, enroll, earn, redeem, or adjust?
11. How are consent, account deletion, exports, duplicate members, and merged accounts handled?
12. Is Como access included in the current Heartland plan or a separate activation/onboarding step?

## Website integration shape

Until official API access is approved, customers should manage ordering and
rewards through the Genius account. The existing website loyalty implementation
is a prototype and must not be treated as the production ledger because hosted
orders never reach the website's internal order-completion endpoint.

When API access is supplied, implement a server-side adapter with:

- Heartland/Como credentials stored only as Cloudflare secrets;
- a mapping between the authenticated website user and the external member ID;
- verified email/mobile linking with an account-merge path;
- idempotent webhook processing for completed orders, refunds, and voids;
- a local read cache of balance/activity, never an independent source of truth;
- audit records for every synchronization or staff adjustment;
- retry handling, signature verification, observability, and reconciliation;
- no storage or handling of payment-card information by the Deaf Shark website.

Do not guess private API endpoints or scrape the hosted ordering website. Use
only documentation and credentials supplied by Heartland/Como.

## Official references

- Heartland Restaurant: https://www.heartland.us/products/point-of-sale/restaurant
- Heartland Restaurant pricing/features: https://www.heartland.us/pricing/restaurant-pos
- Heartland online-ordering setup guide: https://pos.heartlandpaymentsystems.com/kb/kb_upload/file/Online%20Ordering.pdf
- Heartland third-party integration configuration: https://pos.heartlandpaymentsystems.com/kb/kb_upload/file/Heartland%20Restaurant%20-%203rd%20Party%20Integration%20Configuration.pdf

