import { env } from "cloudflare:workers";

/* Signed, self-contained link for confirming a Kean address.

   Nothing is written to the database until the student clicks the link, so an
   unverified address cannot sit on an account. The token carries the account it
   belongs to, so a link mailed to one student cannot verify someone else. */

const TOKEN_TTL_SECONDS = 60 * 60;

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function key() {
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!secret) throw new Error("Signing secret is not configured.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createStudentToken(userId: string, email: string) {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    u: userId,
    e: email,
    x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })));
  const signature = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

export async function readStudentToken(token: unknown) {
  if (typeof token !== "string" || !token.includes(".") || token.length > 2048) return null;
  const [payload, signature] = token.split(".", 2);
  let valid = false;
  try {
    valid = await crypto.subtle.verify("HMAC", await key(), fromBase64url(signature), new TextEncoder().encode(payload));
  } catch {
    return null;
  }
  if (!valid) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as { u?: string; e?: string; x?: number };
    if (!data.u || !data.e || !data.x) return null;
    if (data.x < Math.floor(Date.now() / 1000)) return null;
    return { userId: data.u, email: data.e };
  } catch {
    return null;
  }
}
