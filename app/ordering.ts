/* Master switch for first-party ordering.

   `NEXT_PUBLIC_ORDERING_ENABLED` must be exactly "true" to open the website cart,
   the checkout, and the public POST /api/orders route. Anything else, including an
   unset value, keeps ordering closed: the menu and its prices stay visible, the
   add-to-order controls disappear, and every Order online control shows the
   coming-soon notice. The default is deliberately closed so a missing build
   variable can never expose an untested checkout. */
const orderingEnabled = process.env.NEXT_PUBLIC_ORDERING_ENABLED?.trim().toLowerCase() === "true";

/** Orders are created by this site and routed to the staff order screens. */
export const CUSTOM_CHECKOUT_ENABLED = orderingEnabled;

export type OrderingMode = "hosted" | "integrated";

export interface OrderingAdapter {
  mode: OrderingMode;
  hostedUrl: string | null;
  configuredUrl: string | null;
  enabled: boolean;
}

function validHostedUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    return parsed.protocol === "https:" && !isLocal && !parsed.username && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

const configuredUrl = validHostedUrl(process.env.NEXT_PUBLIC_ORDERING_URL);
export const orderingAdapter: OrderingAdapter = {
  mode: orderingEnabled ? "integrated" : "hosted",
  configuredUrl,
  enabled: orderingEnabled,
  /* No hosted destination. With ordering closed this leaves the link unavailable,
     which is what triggers the coming-soon notice instead of a dead checkout. */
  hostedUrl: null,
};
