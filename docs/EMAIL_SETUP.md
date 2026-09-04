# Production email setup

The website owns the routing rules:

- Contact messages → `contact@deafsharkcoffee.com`
- Employment applications → `employment@deafsharkcoffee.com`
- Administrative and website alerts → `admin@deafsharkcoffee.com`
- Public customer support → `help@deafsharkcoffee.com`
- Staff access allowlist → `admin@deafsharkcoffee.com`

Cloudflare Email Service is the preferred sender because the website already runs on Cloudflare Workers. The application retains Resend as an optional fallback, so form routing is not coupled to one provider.

## One-time Cloudflare setup

Run these commands while authenticated to the Deaf Shark-owned Cloudflare account:

```powershell
npx wrangler email sending enable deafsharkcoffee.com
npx wrangler email sending dns get deafsharkcoffee.com
```

Confirm SPF and DKIM are active in Cloudflare, and add or verify a DMARC policy appropriate for the business. Then configure these production variables:

```text
CLOUDFLARE_EMAIL_ENABLED=true
AUTH_EMAIL_FROM=Deaf Shark Coffee <account@deafsharkcoffee.com>
STAFF_EMAILS=admin@deafsharkcoffee.com
CONTACT_EMAILS=contact@deafsharkcoffee.com
EMPLOYMENT_EMAILS=employment@deafsharkcoffee.com
ADMIN_EMAILS=admin@deafsharkcoffee.com
SUPPORT_EMAIL=help@deafsharkcoffee.com
```

Do not set `CLOUDFLARE_EMAIL_ENABLED=true` until the domain is onboarded successfully. Until then, provide `RESEND_API_KEY` and the same `AUTH_EMAIL_FROM` to use the fallback sender, or leave transactional account email disabled.

## Acceptance test

1. Submit one contact form and confirm delivery to `contact@deafsharkcoffee.com`.
2. Reply to the notification and confirm the reply addresses the customer.
3. Submit one application and confirm delivery to `employment@deafsharkcoffee.com`.
4. Verify the application remains available in the staff dashboard if email delivery is delayed.
5. Trigger one verification email and one password-reset email.
6. Test delivery to real Gmail, Outlook, and iCloud inboxes.
7. Review delivery events and bounce information in Cloudflare Email Service.
