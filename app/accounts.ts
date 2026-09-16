/* Master switch for customer account creation (sign-up).

   `NEXT_PUBLIC_ACCOUNTS_ENABLED` must be exactly "true" to let the public create
   new accounts. Anything else, including an unset value, keeps sign-up closed:
   the create-account UI is hidden, POST /api/profile/signup refuses, and
   better-auth's own /api/auth/sign-up/email is disabled. The default is
   deliberately closed so a missing build variable can never reopen sign-up.

   Signing IN is intentionally NOT gated by this flag, so existing customers and
   staff can still reach their accounts and the dashboard while sign-up is off. */
export const ACCOUNTS_ENABLED = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED?.trim().toLowerCase() === "true";
