Subject: Deaf Shark Coffee website completion responsibilities and handoff

Hi,

I attached one ZIP containing the original legal documents, revised drafts, internal procedures, legal audit, and the full completion package for the Deaf Shark Coffee website.

The revised Terms and Privacy Policy are working drafts. They should not be treated as final legal approval until a New Jersey attorney reviews them. Some related website controls have been built locally, but the entire payment and compliance project has not been approved, fully tested, or deployed to production.

Please act as the technical coordinator and use the completion package as the source of truth. The remaining work is divided as follows.

ATTORNEY

The New Jersey attorney needs to:

- Verify that the correct contracting entity is Deaf Shark Coffee, LLC, doing business as Deaf Shark Coffee, and confirm any trade-name requirements.
- Finalize the Terms of Service and Privacy Policy.
- Approve the age rule allowing customers ages 13 through 17 to use an account with parent or guardian permission and involvement.
- Approve the refund and cancellation rules, including the point when preparation begins, no-shows, all-sales-final language, and remedies for incorrect or defective items.
- Approve the credit-card surcharge disclosure, eligible card types, receipt treatment, and maximum calculation under New Jersey law, Stripe requirements, and card-network rules.
- Approve the loyalty-point expiration and forfeiture rules, promotions, student discount, birthday benefit, referral rules, and restrictions on combining offers.
- Approve the physical gift-card terms, New Jersey cash-redemption requirements, and required scam notices.
- Review account deletion, retained financial records, privacy requests, optional order-ready texts, cookies, future advertising pixels, breach procedures, accessibility, and any required store notices.
- Return final clean legal documents, required customer notices, instructions showing where each notice must appear, and written approval or clearly stated remaining conditions.

ACCOUNTANT

The accountant needs to:

- Approve how long orders, refunds, taxes, Stripe payouts and fees, surcharges, chargebacks, discounts, pay-at-store orders, and gift-card records must be retained. The current working proposal is seven years for financial records.
- Specify exactly which transaction fields must remain after a customer deletes an account and which personal identifiers should be anonymized.
- Confirm how website orders, Stripe payments, pay-at-store transactions, refunds, surcharges, taxes, and Genius POS should be reconciled.
- Approve backup and source-document retention periods and explain when a legal, tax, chargeback, or insurance hold must stop deletion.
- Return a signed retention schedule, database deletion instructions, and a written reconciliation procedure.

TECHNICAL TEAM

The technical team needs to:

- Apply database migration 0020 in staging and production after backing up and confirming rollback procedures.
- Test the versioned Terms and Privacy acceptance records, including acceptance time and the age or guardian confirmation.
- Complete Stripe using trusted server-side totals, signed webhooks, idempotency, payment states, refunds, failures, duplicate prevention, chargebacks, and reconciliation.
- Enforce the approved payment rules: guests must prepay, an account's first order must be prepaid, and eligible returning customers may choose online payment or payment at the store.
- Do not release a prepaid order to the kitchen until Stripe provides trusted payment confirmation.
- Build the surcharge so it is shown before final submission, never exceeds the lowest permitted amount, and is not charged to an ineligible debit or prepaid card. Do not guess a percentage.
- Record when preparation begins. Use the earlier of staff changing the order to Preparing or actually beginning any item. This controls automatic refund eligibility.
- Finish dated loyalty-point lots so each award expires after 12 months and the oldest points are redeemed first. Create a documented treatment for existing balances before expiration is enabled.
- Test authenticated customer data download and account deletion. Deletion must revoke sessions, remove profile and rewards information, preserve only required transaction records, and anonymize customer identifiers.
- Require individual administrator accounts, Google multifactor authentication, least-privilege access, access logging, and removal of shared or former staff access.
- Configure Twilio only for an optional order-ready text. Consent must be stored for the specific order, STOP suppression must work, and no marketing texts may be sent.
- Select and configure a promotional-email provider only after legal approval. It must support domain authentication, a valid postal address, one-step unsubscribe, and suppression.
- Keep Meta Pixel, Google Ads, TikTok Pixel, and similar advertising tracking disabled until every tag is inventoried and the attorney approves the disclosure and consent behavior.
- Keep automated deletion disabled until the attorney and accountant approve the retention schedule. Then add dry-run reports, legal holds, deletion logs, error handling, and backup rotation.
- Complete a WCAG 2.2 AA accessibility review of sign-up, sign-in, account, menu, cart, checkout, order status, policy consent, data download, and deletion.
- Test everything in staging and complete production smoke tests, monitoring, backups, incident contacts, and rollback instructions.

STORE OPERATIONS

The store owner or manager needs to:

- Train staff on when an order becomes Preparing, when cancellation is refundable, how no-shows are handled, and how incorrect or defective items are remade or replaced.
- Make sure the online rules, register signs, receipts, gift-card notices, rewards materials, and staff practices all say the same thing.
- Complete the breach-response contact sheet with the owner, backup, technical contact, cyber insurer, attorney, bank, and vendor contacts.
- Use individual staff accounts and remove access promptly when someone leaves.

CURRENT BUSINESS RULES TO USE

- Orders are pickup only and website orders do not automatically enter Genius POS.
- Stripe is the online processor.
- Guests and first-time account customers must pay online. Eligible returning account customers may pay online or at the store.
- A prepaid order receives a full refund if canceled before preparation begins. After preparation begins, sales are final except for rights the law does not allow the business to waive.
- Physical gift cards are not sold online, never expire, and have no inactivity fee.
- Loyalty points expire 12 months after each award, oldest points are used first, and closing an account forfeits unused points.
- Discounts and promotions do not combine unless the specific promotion says otherwise.
- The current student discount is 10 percent.
- The current birthday benefit is one free drink valued up to $8, redeemable in the store on the customer's birthday.
- Order-ready texts are optional and transactional only. Promotional texts are not approved.
- The business does not sell personal information.

WHAT MUST REMAIN DISABLED

Do not activate live Stripe payments, promotional email, advertising pixels, automated deletion, point expiration, or Twilio order-ready texts until the approvals, configuration, and testing required for that feature are complete.

WHAT I NEED RETURNED

Please return one coordinated package containing:

- The attorney's final approved documents, required notices, and implementation instructions.
- The accountant's signed retention schedule, deletion instructions, and reconciliation procedure.
- The technical implementation report, staging and production test evidence, deployed release information, rollback procedure, and a list showing which production features are enabled or disabled.
- The store procedures, posted notices, staff training confirmation, and completed incident contact sheet.

Please make routine legal, accounting, and technical choices within these instructions without sending me another general questionnaire. Only contact me if something would materially change the ordering model, create a significant recurring cost, or cannot be resolved safely by the appropriate professional. If that happens, send me the recommended solution and the one specific decision you need from me.

I will provide access through named, role-based invitations. Do not request or send passwords, secret keys, recovery codes, or customer database exports by email.

Thank you,

Vinny
