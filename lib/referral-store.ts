import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { customerProfiles } from "../db/schema";
import { createReferralCode } from "./referral.ts";

/* Codes are issued the first time a member opens their account rather than at
   signup, so members who joined before referrals existed get one too. A clash
   with an existing code just tries again with fresh random characters. */
export async function ensureReferralCode(userId: string, displayName: string, current: string | null) {
  if (current) return current;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createReferralCode(displayName);
    try {
      const [updated] = await getDb().update(customerProfiles)
        .set({ referralCode: code })
        .where(and(eq(customerProfiles.userId, userId), isNull(customerProfiles.referralCode)))
        .returning({ referralCode: customerProfiles.referralCode });
      if (updated?.referralCode) return updated.referralCode;
      const [existing] = await getDb().select({ referralCode: customerProfiles.referralCode })
        .from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
      return existing?.referralCode ?? null;
    } catch (error) {
      if (!/UNIQUE constraint failed/i.test(error instanceof Error ? error.message : String(error))) throw error;
    }
  }
  return null;
}

/** The member who owns a referral code, if any. */
export async function referrerForCode(code: string) {
  if (!code) return null;
  const [referrer] = await getDb().select({ userId: customerProfiles.userId })
    .from(customerProfiles).where(eq(customerProfiles.referralCode, code)).limit(1);
  return referrer?.userId ?? null;
}
