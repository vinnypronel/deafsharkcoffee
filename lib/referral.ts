/* Referrals: a member shares their link, and when the friend they referred
   completes a first order the member earns 25 points. The reward is written
   under a reference unique to the referred account, so it can only ever be
   paid once per friend. */

export const REFERRAL_POINTS = 25;
export const REFERRAL_MINIMUM_PAID_CENTS = 500;
export const REFERRAL_MAX_REWARDS_PER_WINDOW = 10;
export const REFERRAL_WINDOW_SECONDS = 30 * 24 * 60 * 60;

export function referralOrderQualifies(subtotalCents: number, discountCents: number) {
  if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(discountCents)) return false;
  return Math.max(0, subtotalCents - discountCents) >= REFERRAL_MINIMUM_PAID_CENTS;
}

/* Referral identity checks are deliberately stricter than sign-in identity.
   Common mailbox aliases must not turn one person into several "friends". */
export function normalizeReferralEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "";
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (["gmail.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com", "mac.com"].includes(domain)) {
    local = local.split("+")[0];
  }
  if (domain === "gmail.com") local = local.replaceAll(".", "");
  return local && domain ? `${local}@${domain}` : "";
}

export function normalizeReferralPhone(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export function referralPartiesAreDistinct(input: {
  referrerUserId: string;
  referredUserId: string;
  referrerEmail: string;
  referredEmail: string;
  referrerPhone?: string | null;
  referredPhone?: string | null;
}) {
  if (!input.referrerUserId || !input.referredUserId || input.referrerUserId === input.referredUserId) return false;
  const referrerEmail = normalizeReferralEmail(input.referrerEmail);
  const referredEmail = normalizeReferralEmail(input.referredEmail);
  if (!referrerEmail || !referredEmail || referrerEmail === referredEmail) return false;
  const referrerPhone = normalizeReferralPhone(input.referrerPhone);
  const referredPhone = normalizeReferralPhone(input.referredPhone);
  return !(referrerPhone && referredPhone && referrerPhone === referredPhone);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeReferralCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : "";
}

/** A short readable code: up to five letters of the first name, then four random characters. */
export function createReferralCode(
  displayName: string,
  random: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length)),
) {
  const stem = (displayName.split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "SHARK";
  const suffix = Array.from(random(4), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${stem}${suffix}`;
}

export function referralReference(referredUserId: string) {
  return `referral:${referredUserId}`;
}
