"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok) throw new Error(data.error || "We could not send your message.");
      setReference(data.reference || "");
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <section className="contact-form-section" aria-labelledby="contact-form-heading">
        <div className="contact-form-success">
          <span className="eyebrow">Message saved</span>
          <h2 id="contact-form-heading">Thank you for reaching out.</h2>
          <p>Your reference is <strong>{reference}</strong>. The Deaf Shark team can review your message and respond using the email you provided.</p>
          <button className="soft-button" type="button" onClick={() => setReference("")}>Send another message</button>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-form-section" aria-labelledby="contact-form-heading">
      <div className="contact-form-intro">
        <span className="eyebrow">Questions and inquiries</span>
        <h2 id="contact-form-heading">Send the shop a message.</h2>
        <p>Use this form for catering, events, order questions, feedback, or anything else the team can help with.</p>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <label><span>Name *</span><input name="name" autoComplete="name" maxLength={100} required /></label>
        <label><span>Email *</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
        <label><span>Topic *</span><select name="topic" defaultValue="general" required><option value="general">General question</option><option value="catering">Catering</option><option value="order">Order help</option><option value="events">Events</option><option value="feedback">Feedback</option></select></label>
        <label className="contact-message"><span>Message *</span><textarea name="message" rows={6} minLength={10} maxLength={3000} required /></label>
        {error && <p className="form-error contact-form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Saving message..." : "Send message"}</button>
      </form>
    </section>
  );
}
