import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { customerProfiles } from "../../../db/schema";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false, signInPath: chatGPTSignInPath("/") });

  await ensureSchema();
  const [existing] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.userId, user.userId)).limit(1);
  const profile = existing ?? (await getDb().insert(customerProfiles).values({
    userId: user.userId,
    email: user.email,
    displayName: user.fullName ?? user.email.split("@")[0],
  }).returning())[0];

  return Response.json({
    authenticated: true,
    profile: { displayName: profile.displayName, email: profile.email, points: profile.points },
    signOutPath: chatGPTSignOutPath("/"),
  });
}
