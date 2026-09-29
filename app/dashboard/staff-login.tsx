"use client";

import { useState } from "react";
import Link from "next/link";

/* Staff sign in for the counter tablet. A successful sign in only opens the
   dashboard when the account is a verified admin; any other account is signed
   straight back out so a customer login never sits on the shop tablet. */
export function StaffLogin({ signedInEmail }: { signedInEmail?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(signedInEmail ? `${signedInEmail} is not an admin account. Sign in with an admin account to open the dashboard.` : "");
  const [showPassword, setShowPassword] = useState(false);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError("Enter your admin email and password.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, callbackURL: `${window.location.origin}/dashboard` }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(data.message || "That email and password did not match.");
      const profile = await fetch("/api/profile", { cache: "no-store", credentials: "include" }).then((result) => result.json() as Promise<{ staff?: boolean }>);
      if (!profile.staff) {
        await signOut();
        throw new Error("This account does not have staff access. Only verified admin accounts can open the dashboard.");
      }
      window.location.replace("/dashboard");
    } catch (caught) {
      setPassword("");
      setError(caught instanceof Error ? caught.message : "We could not sign you in.");
      setBusy(false);
    }
  }

  return (
    <main className="staff-access-page">
      <img src="/email-logo-fin.png" alt="Deaf Shark Coffee" />
      <h1>Staff login</h1>
      <p>Sign in with a verified admin account to open the orders dashboard.</p>
      <form className="staff-login-form" onSubmit={submit} noValidate>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" inputMode="email" /></label>
        <label>Password
          <span className="staff-login-password">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
          </span>
        </label>
        {error && <p className="staff-login-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Signing in..." : "Sign in to dashboard"}</button>
        <div className="staff-login-links">
          <Link href="/?account=signin">Forgot password?</Link>
          <Link href="/">Return home</Link>
        </div>
      </form>
    </main>
  );
}
