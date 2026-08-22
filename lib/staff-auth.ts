import { env } from "cloudflare:workers";
import { getCustomerSession } from "./auth";

function staffEmails() {
  return new Set(
    (env.STAFF_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isStaffEmail(email: string) {
  return staffEmails().has(email.trim().toLowerCase());
}

export async function getStaffSession(request: Request) {
  const session = await getCustomerSession(request);
  if (!session) return null;
  return isStaffEmail(session.user.email) ? session : null;
}

export async function requireStaff(request: Request) {
  const session = await getStaffSession(request);
  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "Staff access required." }, { status: 401 }),
    } as const;
  }
  return { session, response: null } as const;
}
