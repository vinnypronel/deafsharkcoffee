import { env } from "cloudflare:workers";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return emailPattern.test(email) ? email : "";
}

export function cleanPhone(value: unknown) {
  return cleanText(value, 30).replace(/[^0-9+()\- .]/g, "");
}

export async function verifyPublicForm(request: Request, token: unknown) {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
