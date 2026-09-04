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

const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
const TURNSTILE_TIMEOUT_MS = 10_000;

type TurnstileResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function configuredHostnames() {
  return new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function requestExceedsBytes(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > maxBytes;
}

export async function verifyPublicForm(request: Request, token: unknown, expectedAction: string) {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  const hostnames = configuredHostnames();
  const responseToken = typeof token === "string" ? token.trim() : "";
  if (!secret || hostnames.size === 0 || !responseToken || responseToken.length > TURNSTILE_TOKEN_MAX_LENGTH) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", responseToken);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileResult;
    return result.success === true
      && result.action === expectedAction
      && typeof result.hostname === "string"
      && hostnames.has(result.hostname.toLowerCase());
  } catch {
    return false;
  }
}
