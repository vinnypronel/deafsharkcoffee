import { getStaffSession } from "../../../lib/staff-auth";

/* Tells the page whether the visitor is signed in as verified staff, so the
   footer only offers the dashboard link to them. Read-only; the dashboard
   itself still checks access on the server. */
export async function GET(request: Request) {
  try {
    const session = await getStaffSession(request);
    return Response.json({ staff: Boolean(session) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ staff: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
