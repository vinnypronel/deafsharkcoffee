import "../kds.css";
import { headers } from "next/headers";
import Link from "next/link";
import { StationBoard } from "../station-board";

export const dynamic = "force-dynamic";

type Station = "coffee" | "kitchen";

function AccessRequired() {
  return (
    <main className="staff-access-page">
      <img src="/favicon.png" alt="Deaf Shark Coffee" />
      <span>Deaf Shark staff</span>
      <h1>Staff access required.</h1>
      <p>Sign in with an approved Deaf Shark administrator account to open this order screen.</p>
      <div><Link className="primary-button" href="/?account=signin&returnTo=/dashboard">Open staff sign in</Link><Link className="soft-button" href="/">Return home</Link></div>
    </main>
  );
}

export default async function StationPage({ params }: { params: Promise<{ station: string }> }) {
  const { station } = await params;
  if (station !== "coffee" && station !== "kitchen") {
    return <main className="staff-access-page"><h1>Order screen not found.</h1><Link className="primary-button" href="/dashboard">Open dashboard</Link></main>;
  }

  const requestHeaders = await headers();
  if (requestHeaders.get("x-deaf-shark-render-test") === "denied") return <AccessRequired />;
  const [{ getAuth }, { isStaffEmail }] = await Promise.all([
    import("../../../lib/auth"),
    import("../../../lib/staff-auth"),
  ]);
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || !isStaffEmail(session.user.email)) return <AccessRequired />;
  return <StationBoard station={station as Station} />;
}
