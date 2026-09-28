import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { memberOffers } from "../db/schema";
import { WELCOME_OFFER_TYPE } from "./loyalty";

/* The sign-up reward: one 50% off drink coupon per account, with no expiry.
   Safe to call any number of times; the unique (user, offer type) index means
   an account never gets a second coupon, even after using the first. */
export async function issueWelcomeOffer(userId: string) {
  if (env.LOYALTY_ENABLED !== "true") return;
  await getDb().insert(memberOffers).values({
    userId,
    offerType: WELCOME_OFFER_TYPE,
    code: `SHARK50-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  }).onConflictDoNothing({ target: [memberOffers.userId, memberOffers.offerType] });
}
