import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { customerProfiles } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";

/* Staff correction of customer details.

   Customers cannot edit their own name or number once the account exists,
   because an order in the kitchen is matched to them. That leaves someone who
   mistyped a digit unreachable, so the shop needs a way to fix it. Staff only,
   and every change is attributed in the log. */

export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const payload = (await request.json()) as { userId?: string; displayName?: string; phone?: string };
  const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const displayName = payload.displayName?.trim() ?? "";
  const rawPhone = payload.phone?.replace(/[^0-9+()\- .]/g, "").trim() ?? "";
  const phone = rawPhone || null;

  if (!userId) return Response.json({ error: "Choose a customer to update." }, { status: 400 });
  if (!displayName || displayName.length > 80) {
    return Response.json({ error: "Enter the customer's name." }, { status: 400 });
  }
  if (phone && (phone.replace(/\D/g, "").length < 10 || phone.length > 24)) {
    return Response.json({ error: "Enter a complete phone number or leave it blank." }, { status: 400 });
  }

  const [updated] = await getDb().update(customerProfiles)
    .set({ displayName, phone, updatedAt: new Date() })
    .where(eq(customerProfiles.userId, userId))
    .returning();

  if (!updated) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  console.log(JSON.stringify({
    service: "deaf-shark-coffee",
    component: "admin-customers",
    event: "customer_details_updated",
    userId,
    by: staff.session.user.email,
  }));

  return Response.json({ success: true, profile: updated }, { headers: { "Cache-Control": "no-store" } });
}
