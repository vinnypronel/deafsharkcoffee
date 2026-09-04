"use client";

import { useState, type FormEvent } from "react";
import TurnstileWidget from "../turnstile-widget";
import { PHONE_INPUT_MAX_LENGTH, formatPhoneInput } from "../../lib/phone-format";

type ContactField = "name" | "email" | "message";
type ContactErrors = Partial<Record<ContactField, string>>;

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return <span className="contact-field-error" id={id} role="alert"><i aria-hidden="true">!</i>{children}</span>;
}

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactErrors>({});
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = String(values.name || "").trim();
    const email = String(values.email || "").trim();
    const message = String(values.message || "").trim();
    const nextErrors: ContactErrors = {};
    if (!name) nextErrors.name = "Tell us your name so the team knows who is writing.";
    if (!email) nextErrors.email = "Enter the email address where we should reply.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a complete email address, like you@example.com.";
    if (!message) nextErrors.message = "Write a short message for the Deaf Shark team.";
    else if (message.length < 10) nextErrors.message = "Please add a little more detail—at least 10 characters.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!turnstileToken) {
      setError("Please complete the security check before sending your message.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken }),
      });
      const data = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok) throw new Error(data.error || "We could not send your message.");
      setReference(data.reference || "");
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your message.");
    } finally {
      setSubmitting(false);
      setTurnstileResetKey((current) => current + 1);
    }
  }

  if (reference) {
    return (
      <section className="contact-form-section" aria-labelledby="contact-form-heading">
        <div className="contact-form-success">
          <img
            className="contact-success-logo"
            src="/deafshark-logo-640.webp"
            alt=""
            aria-hidden="true"
            width={72}
            height={72}
            loading="eager"
            decoding="async"
          />
          <h2 id="contact-form-heading">Thank you for reaching out.</h2>
          <p>We have your message. The Deaf Shark team will get back to you at the email you provided.</p>
          <button className="soft-button" type="button" onClick={() => setReference("")}>Send another message</button>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-form-section" aria-labelledby="contact-form-heading">
      <div className="contact-form-intro">
        <h2 id="contact-form-heading">Send us a message.</h2>
        <p>Use this form for catering, events, order questions, feedback, or anything else the team can help with.</p>
      </div>
      <form
        className="contact-form"
        onSubmit={submit}
        noValidate
        onChange={(event) => {
          /* React types target as the form this handler sits on, but the change
             event bubbles up from the field the user edited. */
          const field = (event.target as unknown as { name?: string }).name as ContactField;
          if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
        }}
      >
        <label className={fieldErrors.name ? "has-error" : undefined}><span>Name *</span><input name="name" autoComplete="name" maxLength={100} aria-invalid={fieldErrors.name ? true : undefined} aria-describedby={fieldErrors.name ? "contact-name-error" : undefined} /><FieldError id="contact-name-error">{fieldErrors.name}</FieldError></label>
        <label className={fieldErrors.email ? "has-error" : undefined}><span>Email *</span><input name="email" type="email" autoComplete="email" maxLength={254} aria-invalid={fieldErrors.email ? true : undefined} aria-describedby={fieldErrors.email ? "contact-email-error" : undefined} /><FieldError id="contact-email-error">{fieldErrors.email}</FieldError></label>
        <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" value={phone} maxLength={PHONE_INPUT_MAX_LENGTH} placeholder="(908)-555-0123" onChange={(event) => setPhone(formatPhoneInput(event.target.value))} /></label>
        <label><span>Topic *</span><select name="topic" defaultValue="general"><option value="general">General question</option><option value="catering">Catering</option><option value="order">Order help</option><option value="events">Events</option><option value="feedback">Feedback</option></select></label>
        <label className={`contact-message${fieldErrors.message ? " has-error" : ""}`}><span>Message *</span><textarea name="message" rows={6} minLength={10} maxLength={3000} aria-invalid={fieldErrors.message ? true : undefined} aria-describedby={fieldErrors.message ? "contact-message-error" : undefined} /><FieldError id="contact-message-error">{fieldErrors.message}</FieldError></label>
        <TurnstileWidget action="contact" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
        {error && <p className="form-error contact-form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Saving message..." : "Send message"}</button>
      </form>
    </section>
  );
}
