"use client";

import { useState } from "react";

export function PuppyRsvp() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");
  const [guests, setGuests] = useState(1);
  const [dogsCount, setDogsCount] = useState(1);

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (!digits) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      const rsvpData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
        guests,
        dogsCount,
        timestamp: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("deafshark_puppy_rsvps") || "[]");
      existing.push(rsvpData);
      localStorage.setItem("deafshark_puppy_rsvps", JSON.stringify(existing));
    } catch {}

    setSubmitted(true);
  }

  function handleReset() {
    setSubmitted(false);
    setName("");
    setPhone("");
    setEmail("");
    setDogName("");
    setDogBreed("");
    setGuests(1);
    setDogsCount(1);
  }

  return (
    <div className="puppy-rsvp-container">
      {!isOpen && !submitted && (
        <div className="puppy-rsvp-cta-row">
          <button
            type="button"
            className="primary-button hero-cta-btn"
            onClick={() => setIsOpen(true)}
          >
            <span>RSVP for Puppy Party · Free</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <a className="secondary-button hero-cta-btn" href="tel:+19084818884">
            <span>Call shop</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      {isOpen && !submitted && (
        <form className="puppy-rsvp-form" onSubmit={handleSubmit}>
          <div className="puppy-rsvp-header">
            <div>
              <span className="ev-eyebrow">Guest list</span>
              <h3>RSVP for Puppy Party</h3>
              <p>Friday, August 21 · 6:00 PM to 9:00 PM · Free entry</p>
            </div>
            <button
              type="button"
              className="puppy-rsvp-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close RSVP form"
            >
              ×
            </button>
          </div>

          <div className="puppy-rsvp-grid">
            <label className="puppy-field">
              <span>Your name *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First & last name"
              />
            </label>

            <label className="puppy-field">
              <span>Mobile number *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(908)-555-0123"
                maxLength={14}
              />
            </label>

            <label className="puppy-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="puppy-field">
              <span>Dog&apos;s name (if bringing a pup)</span>
              <input
                type="text"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                placeholder="e.g. Mango, Luna, Charlie"
              />
            </label>

            <label className="puppy-field">
              <span>Dog breed</span>
              <input
                type="text"
                value={dogBreed}
                onChange={(e) => setDogBreed(e.target.value)}
                placeholder="e.g. Dachshund, Golden Retriever"
              />
            </label>

            <div className="puppy-field-row">
              <label className="puppy-field">
                <span>Humans</span>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                  <option value={1}>1 person</option>
                  <option value={2}>2 people</option>
                  <option value={3}>3 people</option>
                  <option value={4}>4+ people</option>
                </select>
              </label>

              <label className="puppy-field">
                <span>Dogs</span>
                <select value={dogsCount} onChange={(e) => setDogsCount(Number(e.target.value))}>
                  <option value={0}>0 (just visiting!)</option>
                  <option value={1}>1 dog</option>
                  <option value={2}>2 dogs</option>
                  <option value={3}>3+ dogs</option>
                </select>
              </label>
            </div>
          </div>

          <div className="puppy-rsvp-footer">
            <button type="submit" className="primary-button puppy-submit-btn">
              Confirm Free RSVP
            </button>
            <small className="puppy-rsvp-note">
              Free admission · BYOB · Dog treats & menu on deck
            </small>
          </div>
        </form>
      )}

      {submitted && (
        <div className="puppy-rsvp-confirmed">
          <div className="puppy-confirmed-icon">🐾</div>
          <h3>You&apos;re on the guest list!</h3>
          <p>
            Thanks <strong>{name}</strong>! We have you {dogName ? `and ${dogName}` : ""} confirmed for the Puppy Party on <strong>Friday, August 21 from 6:00 to 9:00 PM</strong> at 900 Green Lane, Union.
          </p>
          <div className="puppy-confirmed-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleReset}
            >
              RSVP another guest
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
