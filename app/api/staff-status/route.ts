function sessionStatus(authenticated: boolean, staff: boolean) {
  return Response.json({ authenticated, staff }, { headers: { "Cache-Control": "no-store" } });
}

/* Customer chrome shares this session check for order polling and the staff
   link. The orders API and dashboard still authorize their own requests. */
export async function GET(request: Request) {
  if (!request.headers.get("cookie")) return sessionStatus(false, false);
  try {
    const [{ getCustomerSession }, { isStaffEmail }] = await Promise.all([
      import("../../../lib/auth"),
      import("../../../lib/staff-auth"),
    ]);
    const session = await getCustomerSession(request);
    const staff = session?.user.emailVerified === true && isStaffEmail(session.user.email);
    return sessionStatus(Boolean(session), staff);
  } catch {
    return sessionStatus(false, false);
  }
}
