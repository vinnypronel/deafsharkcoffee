import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import {
  contactInquiries,
  customerProfiles,
  employmentApplications,
  loyaltyTransactions,
  memberOffers,
  newsletterSubscriptions,
  orders,
} from "../../../../db/schema";
import { getCustomerSession } from "../../../../lib/auth";

export async function GET(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) {
    return Response.json({ error: "Sign in to download your information." }, { status: 401 });
  }
  await ensureSchema();

  const db = getDb();
  const email = session.user.email.toLowerCase();
  const [profileRows, orderRows, loyaltyRows, offerRows, subscriptionRows, inquiryRows, applicationRows] = await Promise.all([
    db.select().from(customerProfiles).where(eq(customerProfiles.userId, session.user.id)).limit(1),
    db.select().from(orders).where(eq(orders.customerUserId, session.user.id)).orderBy(asc(orders.createdAt)),
    db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, session.user.id)).orderBy(asc(loyaltyTransactions.createdAt)),
    db.select().from(memberOffers).where(eq(memberOffers.userId, session.user.id)).orderBy(asc(memberOffers.issuedAt)),
    db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email)),
    db.select().from(contactInquiries).where(eq(contactInquiries.email, email)).orderBy(asc(contactInquiries.createdAt)),
    db.select({
      id: employmentApplications.id,
      fullName: employmentApplications.fullName,
      email: employmentApplications.email,
      phone: employmentApplications.phone,
      position: employmentApplications.position,
      employmentType: employmentApplications.employmentType,
      daysJson: employmentApplications.daysJson,
      shift: employmentApplications.shift,
      startDate: employmentApplications.startDate,
      isAdult: employmentApplications.isAdult,
      experience: employmentApplications.experience,
      why: employmentApplications.why,
      resumeName: employmentApplications.resumeName,
      resumeType: employmentApplications.resumeType,
      resumeSize: employmentApplications.resumeSize,
      status: employmentApplications.status,
      createdAt: employmentApplications.createdAt,
      updatedAt: employmentApplications.updatedAt,
    }).from(employmentApplications).where(eq(employmentApplications.email, email)).orderBy(asc(employmentApplications.createdAt)),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    },
    profile: profileRows[0] ?? null,
    orders: orderRows.map((order) => ({ ...order, items: JSON.parse(order.itemsJson), itemsJson: undefined })),
    loyaltyTransactions: loyaltyRows,
    offers: offerRows,
    marketingSubscriptions: subscriptionRows,
    contactInquiries: inquiryRows,
    employmentApplications: applicationRows.map((application) => ({
      ...application,
      availableDays: JSON.parse(application.daysJson),
      daysJson: undefined,
    })),
    excludedForSecurity: ["password hashes", "session tokens", "authentication tokens", "internal security signals"],
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="deaf-shark-coffee-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
