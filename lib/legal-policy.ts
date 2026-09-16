export const TERMS_VERSION = "2026-09-14";
export const PRIVACY_VERSION = "2026-09-14";

export const ORDER_READY_SMS_CONSENT =
  "Text me once when this order is ready. Message and data rates may apply. Reply STOP to opt out.";

export function hasCurrentLegalAcceptance(profile: {
  termsVersion?: string | null;
  privacyVersion?: string | null;
  ageGuardianConfirmedAt?: Date | null;
}) {
  return profile.termsVersion === TERMS_VERSION &&
    profile.privacyVersion === PRIVACY_VERSION &&
    Boolean(profile.ageGuardianConfirmedAt);
}
