import { env } from "cloudflare:workers";
import { ensureSchema } from "../../../../db";
import { getCustomerSession } from "../../../../lib/auth";

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "That request did not come from this website." }, { status: 403 });
  }

  const session = await getCustomerSession(request);
  if (!session) {
    return Response.json({ error: "Sign in to close your account." }, { status: 401 });
  }

  let payload: { confirmation?: string };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return Response.json({ error: "We could not read that request." }, { status: 400 });
  }
  if (payload.confirmation !== "DELETE") {
    return Response.json({ error: "Type DELETE exactly to close your account." }, { status: 400 });
  }

  await ensureSchema();
  const userId = session.user.id;
  const email = session.user.email.toLowerCase();
  const deletedName = "Deleted customer";

  /* D1 batch is transactional. Order amounts and item records remain for tax,
     accounting, refunds, fraud review, and disputes, but direct identifiers and
     the account link are removed. Marketing keeps only an unsubscribed
     suppression record so an old address is not accidentally re-enrolled. */
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET customer_name = ?, phone = '', customer_user_id = NULL,
      idempotency_key = NULL, sms_opt_in = false, sms_consented_at = NULL, sms_consent_text = NULL
      WHERE customer_user_id = ?`).bind(deletedName, userId),
    env.DB.prepare("DELETE FROM loyalty_transactions WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM member_offers WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM customer_profiles WHERE user_id = ?").bind(userId),
    env.DB.prepare(`UPDATE newsletter_subscriptions SET status = 'unsubscribed',
      consent_text = 'Suppression record retained after account closure',
      consent_source = 'account_closure', updated_at = unixepoch() WHERE lower(email) = ?`).bind(email),
    env.DB.prepare("DELETE FROM session WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM account WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM verification WHERE lower(identifier) = ?").bind(email),
    env.DB.prepare("DELETE FROM user WHERE id = ?").bind(userId),
  ]);

  return Response.json({
    success: true,
    message: "Your account was closed, loyalty points were forfeited, and retained order records were anonymized.",
  }, { headers: { "Cache-Control": "no-store" } });
}
