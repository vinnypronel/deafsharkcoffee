import "../kds/kds.css";
import { Dashboard } from "./dashboard";
import { headers } from "next/headers";
import { StaffLogin } from "./staff-login";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  // The Node-only render test cannot load Cloudflare runtime bindings. This
  // header only forces the denied state and never grants staff access.
  if (requestHeaders.get("x-deaf-shark-render-test") === "denied") return <StaffLogin />;

  const [{ getAuth }, { isStaffEmail }] = await Promise.all([
    import("../../lib/auth"),
    import("../../lib/staff-auth"),
  ]);
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return <StaffLogin />;
  /* Same rule as the staff APIs: an allowlisted address counts only once the
     owner has verified it. */
  if (session.user.emailVerified !== true || !isStaffEmail(session.user.email)) return <StaffLogin signedInEmail={session.user.email} />;
  return <Dashboard />;
}
