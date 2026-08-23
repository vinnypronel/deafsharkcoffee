import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { contactInquiries, employmentApplications, newsletterSubscriptions, orders } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();
  const [orderHistory, contacts, applications, subscribers] = await Promise.all([
    getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(250),
    getDb().select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)).limit(250),
    getDb().select().from(employmentApplications).orderBy(desc(employmentApplications.createdAt)).limit(250),
    getDb().select().from(newsletterSubscriptions).orderBy(desc(newsletterSubscriptions.consentedAt)).limit(500),
  ]);
  return Response.json({ orders: orderHistory, contacts, applications, subscribers });
}
