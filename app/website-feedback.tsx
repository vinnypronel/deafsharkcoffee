"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TurnstileWidget from "./turnstile-widget";

const OPEN_EVENT = "open-website-feedback";
const KINDS = [
  { key: "broken", label: "Something's broken" },
  { key: "order", label: "Problem with an order" },
  { key: "wording", label: "Confusing or wrong wording" },
  { key: "idea", label: "Idea or request" },
] as const;

/** Opens the feedback dialog from anywhere on the site. */
export function openWebsiteFeedback() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function WebsiteFeedbackForm({ orderNumber, onSent }: { orderNumber?: string; onSent?: () => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("broken");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (message.trim().length < 5) return setError("Tell us a little more so we can look into it.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: message.trim(),
          email: email.trim(),
          page: window.location.pathname + window.location.search,
          orderNumber,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          turnstileToken: token,
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "We could not send that just now. Please try again.");
      setSent(true);
      onSent?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send that just now. Please try again.");
      setResetKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="feedback-sent" role="status">Thank you. We read every one of these.</p>;

  return (
    <form className="feedback-form" onSubmit={submit} noValidate>
      <div className="feedback-kinds" role="radiogroup" aria-label="What is this about?">
        {KINDS.map((option) => (
          <button key={option.key} type="button" role="radio" aria-checked={kind === option.key} className={kind === option.key ? "active" : ""} onClick={() => setKind(option.key)}>{option.label}</button>
        ))}
      </div>
      <label className="feedback-field">
        <span>Tell us what happened or what you would like to see</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={2000} placeholder="For example: the checkout button did nothing on my phone." />
      </label>
      <label className="feedback-field">
        <span>Email (optional, if you want a reply)</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} placeholder="you@example.com" autoComplete="email" />
      </label>
      <TurnstileWidget action="feedback" onToken={setToken} resetKey={resetKey} />
      {error && <p className="feedback-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button feedback-submit" disabled={busy}>{busy ? "Sending..." : "Send feedback"}</button>
    </form>
  );
}

/** Mounted once in the footer; any "Website feedback" link opens it. */
export function WebsiteFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const show = () => { setRound((value) => value + 1); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  /* Rendered on the body: the footer it lives in becomes a stacked card on
     phones, and a dialog inside that card would sit under the header. */
  return createPortal(
    <div className="modal-backdrop feedback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close feedback">×</button>
        <span className="eyebrow">Feedback</span>
        <h2 id="feedback-title">Tell us what is not working</h2>
        <p>Use this for anything about the website, your account, or ordering online: something broken, a problem with an order, wording that is confusing or wrong, or an idea for something new.</p>
        <p className="feedback-note">Have a problem with your order right now? Call the shop at <a href="tel:9084818884">(908) 481-8884</a> so they can fix it on the spot.</p>
        <WebsiteFeedbackForm key={round} />
      </section>
    </div>,
    document.body,
  );
}

/** Compact prompt for the order confirmation: one tap opens the form in place. */
export function OrderFeedbackPrompt({ orderNumber }: { orderNumber?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="order-feedback">
      {!open ? (
        <>
          <p><strong>How was ordering online?</strong> Tell us about anything that did not work, was confusing, or that you would like to see. Problems with an order go here too.</p>
          <p className="order-feedback-call">Have a problem with your order right now? Call the shop at <a href="tel:9084818884">(908) 481-8884</a>.</p>
          <button type="button" className="secondary-button order-feedback-open" onClick={() => setOpen(true)}>Share feedback</button>
        </>
      ) : (
        <WebsiteFeedbackForm orderNumber={orderNumber} />
      )}
    </div>
  );
}
