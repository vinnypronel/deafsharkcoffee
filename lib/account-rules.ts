import { env } from "cloudflare:workers";

export const KEAN_SIGNUP_MESSAGE = "Please sign up with a personal email, not your Kean address. You can add your Kean email in your profile afterwards to get the student discount.";
export const PHONE_IN_USE_MESSAGE = "That phone number is already on another Deaf Shark account. Sign in to that account, or use a different number.";

/** The ten digits that identify a US mobile number, however it was typed. */
export function phoneKey(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

const STORED_PHONE_DIGITS = "replace(replace(replace(replace(replace(replace(phone, '(', ''), ')', ''), '-', ''), ' ', ''), '.', ''), '+', '')";

/* One account per phone number. Numbers are not confirmed by text, so this
   stops honest duplicates rather than someone set on typing a different one.
   `except` names the account that is allowed to hold the number already. */
export async function phoneBelongsToAnotherAccount(phone: string | null | undefined, except: { userId?: string; email?: string } = {}) {
  const key = phoneKey(phone);
  if (!key) return false;
  const row = await env.DB.prepare(
    `SELECT 1 AS found FROM customer_profiles
     WHERE phone IS NOT NULL AND substr(${STORED_PHONE_DIGITS}, -10) = ?
       AND user_id != ? AND lower(email) != ? LIMIT 1`,
  ).bind(key, except.userId ?? "", (except.email ?? "").toLowerCase()).first();
  return Boolean(row);
}
