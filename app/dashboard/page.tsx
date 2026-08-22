import { Dashboard } from "./dashboard";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function AccessRequired() {
  return (
    <main className="staff-access-page">
      <img src="/favicon.png" alt="Deaf Shark Coffee" />
      <span>Deaf Shark staff</span>
      <h1>Staff access required.</h1>
      <p>Sign in from the customer account button using an email address approved for the staff dashboard, then return here.</p>
      <div><Link className="primary-button" href="/">Go to sign in</Link><Link className="soft-button" href="/">Return home</Link></div>
    </main>
  );
}

export default async function DashboardPage() {
  const requestHeaders = await headers();
  // The Node-only render test cannot load Cloudflare runtime bindings. This
  // header only forces the denied state and never grants staff access.
  if (requestHeaders.get("x-deaf-shark-render-test") === "denied") return <AccessRequired />;

  const [{ getAuth }, { isStaffEmail }] = await Promise.all([
    import("../../lib/auth"),
    import("../../lib/staff-auth"),
  ]);
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || !isStaffEmail(session.user.email)) return <AccessRequired />;
  return <Dashboard />;
}
