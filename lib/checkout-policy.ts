import { OrderRequestError } from "./order-intake.ts";

/** Online payments need a separate verified payment flow. Never silently turn
 * an attempted card payment into an unpaid ticket. */
export function requirePickupAccount(paymentMethod: unknown, user: { id: string; emailVerified: boolean } | null | undefined) {
  if (paymentMethod !== undefined && paymentMethod !== "pickup") {
    throw new OrderRequestError("Online payment is not available yet. Sign in to pay at pickup.", 503, "online_payment_unavailable");
  }
  if (!user) throw new OrderRequestError("Sign in or create an account to pay at pickup. Guest checkout requires online payment.", 401, "account_required");
  if (!user.emailVerified) throw new OrderRequestError("Verify your email before placing an order.", 403, "verification_required");
  return user.id;
}
