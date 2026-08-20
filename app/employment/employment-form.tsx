"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

const positions = ["Barista", "Kitchen", "Cashier", "Shift Lead", "Open to anything"];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shifts = ["Morning", "Afternoon", "Evening", "Flexible"];
const employmentTypes = ["Full time", "Part time", "Either"];

type FieldName =
  | "fullName"
  | "email"
  | "phone"
  | "position"
  | "employmentType"
  | "shift"
  | "startDate"
  | "isAdult"
  | "experience"
  | "why";

type Errors = Partial<Record<FieldName, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EmploymentForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [shift, setShift] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isAdult, setIsAdult] = useState("");
  const [experience, setExperience] = useState("");
  const [why, setWhy] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggleDay(day: string) {
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  function onResumeChange(event: ChangeEvent<HTMLInputElement>) {
    setResumeName(event.target.files?.[0]?.name ?? "");
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = "Please enter your full name.";
    if (!email.trim()) next.email = "Please enter an email address.";
    else if (!emailPattern.test(email.trim())) next.email = "Please enter a valid email address.";
    if (!phone.trim()) next.phone = "Please enter a phone number where we can reach you.";
    if (!position) next.position = "Please choose the position you are applying for.";
    if (!employmentType) next.employmentType = "Please choose full time, part time, or either.";
    if (!isAdult) next.isAdult = "Please let us know if you are 18 or older.";
    return next;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`emp-${firstError}`)?.focus();
      return;
    }
    setSubmitted(true);
  }

  function startOver() {
    setSubmitted(false);
    setErrors({});
  }

  const describedBy = (field: FieldName, extra?: string) => {
    const parts = [extra, errors[field] ? `emp-${field}-error` : undefined].filter(Boolean);
    return parts.length ? parts.join(" ") : undefined;
  };

  if (submitted) {
    return (
      <section className="emp-form-section" aria-labelledby="emp-confirm-heading">
        <div className="emp-confirmation">
          <h2 id="emp-confirm-heading">Application received.</h2>
          <p>
            Thank you for your interest in joining the Deaf Shark Coffee team! We will review your application and get in touch with you shortly.
          </p>
          <p>To follow up on working at the shop, you can also call (908) 481-8884 or stop by 900 Green Lane in Union.</p>
          <div className="emp-confirmation-actions">
            <button type="button" className="primary-button" onClick={startOver}>
              Back to the form
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="emp-form-section" id="apply" aria-labelledby="emp-form-heading">
      <div className="emp-form-intro">
        <h2 id="emp-form-heading">Apply now</h2>
        <p>Fields marked with <span className="emp-required">*</span> are required. Everything else is optional.</p>
      </div>

      <form className="emp-form" onSubmit={onSubmit} noValidate>
        <div className="emp-grid">
          <div className="emp-field">
            <label htmlFor="emp-fullName">
              Full name <span className="emp-required">*</span>
            </label>
            <input
              id="emp-fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearError("fullName");
              }}
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={describedBy("fullName")}
            />
            {errors.fullName && (
              <p className="emp-error" id="emp-fullName-error">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="emp-field">
            <label htmlFor="emp-email">
              Email <span className="emp-required">*</span>
            </label>
            <input
              id="emp-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError("email");
              }}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy("email")}
            />
            {errors.email && (
              <p className="emp-error" id="emp-email-error">
                {errors.email}
              </p>
            )}
          </div>

          <div className="emp-field">
            <label htmlFor="emp-phone">
              Phone <span className="emp-required">*</span>
            </label>
            <input
              id="emp-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                clearError("phone");
              }}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={describedBy("phone")}
            />
            {errors.phone && (
              <p className="emp-error" id="emp-phone-error">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="emp-field">
            <label htmlFor="emp-position">
              Position applying for <span className="emp-required">*</span>
            </label>
            <select
              id="emp-position"
              name="position"
              className="emp-select"
              value={position}
              onChange={(event) => {
                setPosition(event.target.value);
                clearError("position");
              }}
              aria-invalid={errors.position ? true : undefined}
              aria-describedby={describedBy("position")}
            >
              <option value="">Choose a position</option>
              {positions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.position && (
              <p className="emp-error" id="emp-position-error">
                {errors.position}
              </p>
            )}
          </div>

          <fieldset className="emp-fieldset emp-span-2">
            <legend id="emp-employmentType-legend">
              Employment type <span className="emp-required">*</span>
            </legend>
            <div
              className="emp-choice-row"
              role="radiogroup"
              aria-labelledby="emp-employmentType-legend"
              aria-invalid={errors.employmentType ? true : undefined}
              aria-describedby={describedBy("employmentType")}
            >
              {employmentTypes.map((option, index) => (
                <label className="emp-choice" key={option} htmlFor={index === 0 ? "emp-employmentType" : `emp-type-${index}`}>
                  <input
                    id={index === 0 ? "emp-employmentType" : `emp-type-${index}`}
                    name="employmentType"
                    type="radio"
                    value={option}
                    checked={employmentType === option}
                    onChange={() => {
                      setEmploymentType(option);
                      clearError("employmentType");
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {errors.employmentType && (
              <p className="emp-error" id="emp-employmentType-error">
                {errors.employmentType}
              </p>
            )}
          </fieldset>

          <fieldset className="emp-fieldset emp-span-2">
            <legend>Days you are available</legend>
            <p className="emp-hint" id="emp-days-hint">
              Select every day you could work. Leave them all unselected if you are not sure yet.
            </p>
            <div className="emp-day-row">
              {weekDays.map((day) => (
                <label className="emp-day" key={day} htmlFor={`emp-day-${day}`}>
                  <input
                    id={`emp-day-${day}`}
                    name="days"
                    type="checkbox"
                    value={day}
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    aria-describedby="emp-days-hint"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="emp-field">
            <label htmlFor="emp-shift">Preferred shift</label>
            <select
              id="emp-shift"
              name="shift"
              className="emp-select"
              value={shift}
              onChange={(event) => setShift(event.target.value)}
            >
              <option value="">No preference</option>
              {shifts.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="emp-field">
            <label htmlFor="emp-startDate">Earliest start date</label>
            <input
              id="emp-startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <fieldset className="emp-fieldset emp-span-2">
            <legend id="emp-isAdult-legend">
              Are you 18 or older <span className="emp-required">required</span>
            </legend>
            <div
              className="emp-choice-row emp-choice-row-narrow"
              role="radiogroup"
              aria-labelledby="emp-isAdult-legend"
              aria-invalid={errors.isAdult ? true : undefined}
              aria-describedby={describedBy("isAdult")}
            >
              {["Yes", "No"].map((option, index) => (
                <label className="emp-choice" key={option} htmlFor={index === 0 ? "emp-isAdult" : `emp-adult-${index}`}>
                  <input
                    id={index === 0 ? "emp-isAdult" : `emp-adult-${index}`}
                    name="isAdult"
                    type="radio"
                    value={option}
                    checked={isAdult === option}
                    onChange={() => {
                      setIsAdult(option);
                      clearError("isAdult");
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {errors.isAdult && (
              <p className="emp-error" id="emp-isAdult-error">
                {errors.isAdult}
              </p>
            )}
          </fieldset>

          <div className="emp-field emp-span-2">
            <label htmlFor="emp-experience">Previous experience</label>
            <textarea
              id="emp-experience"
              name="experience"
              rows={5}
              placeholder="Where you have worked, what you did, and how long you were there. Write none if this would be your first job."
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
            />
          </div>

          <div className="emp-field emp-span-2">
            <label htmlFor="emp-why">Why Deaf Shark</label>
            <textarea
              id="emp-why"
              name="why"
              rows={5}
              placeholder="Tell us what brought you to the shop and what you are hoping to get out of the job."
              value={why}
              onChange={(event) => setWhy(event.target.value)}
            />
          </div>

          <div className="emp-field emp-span-2">
            <label htmlFor="emp-resume">Resume</label>
            <input
              id="emp-resume"
              name="resume"
              type="file"
              className="emp-file"
              accept=".pdf,.doc,.docx,.txt,.rtf"
              onChange={onResumeChange}
              aria-describedby="emp-resume-note"
            />
            {resumeName && <p className="emp-file-name">Selected file: {resumeName}</p>}
            <p className="emp-hint" id="emp-resume-note">
              Accepted formats: PDF, Word, RTF, or plain text.
            </p>
          </div>
        </div>

        <div className="emp-submit-row">
          <button type="submit" className="primary-button emp-submit">
            Submit application
          </button>
        </div>
      </form>
    </section>
  );
}

export function ApplyButton() {
  const scrollToApply = (e: React.MouseEvent) => {
    e.preventDefault();
    const lenis = (window as unknown as { __lenis?: { scrollTo: (target: string | HTMLElement, opts?: object) => void } }).__lenis;
    const target = document.getElementById("apply");
    if (lenis && target) {
      lenis.scrollTo(target, { offset: -70, duration: 1.2 });
    } else if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <a href="#apply" onClick={scrollToApply} className="primary-button hero-cta-btn emp-flyer-btn">
      <span>Apply below</span>
      <svg className="btn-arrow btn-arrow-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    </a>
  );
}
