"use client";

import Link from "next/link";
import Lenis from "lenis";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { menuProducts, type Product } from "./menu-data";
import { OfferBarcode } from "./offer-barcode";
import { OrderOnlineLink } from "./order-online-link";
type ProfileResponse = { authenticated: boolean; profile?: { displayName: string; email: string; phone?: string | null; points: number; lifetimePoints: number; activity?: Array<{ id: number; pointsChange: number; balanceAfter: number; reason: string; createdAt: string }>; welcomeOffer?: { id: number; code: string; status: string; issuedAt: string; redeemedAt?: string | null } | null } };
type AuthConfig = { googleEnabled: boolean; emailEnabled: boolean; emailVerificationEnabled: boolean; passwordRecoveryEnabled: boolean };
type LenisController = { start: () => void; stop: () => void; scrollTo: (target: number, options?: Record<string, unknown>) => void };
type WindowWithLenis = Window & { __lenis?: LenisController };

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function menuSearchScore(product: Product, normalizedQuery: string) {
  const name = normalizeSearchText(product.name);
  const category = normalizeSearchText(product.category);
  const description = normalizeSearchText(product.description);
  const searchableText = `${name} ${category} ${description}`;
  const queryWords = normalizedQuery.split(" ").filter(Boolean);

  if (!queryWords.every((word) => searchableText.includes(word))) return null;

  let score = 0;
  if (name === normalizedQuery) score -= 1000;
  else if (name.startsWith(normalizedQuery)) score -= 700;
  else if (name.includes(normalizedQuery)) score -= 500;
  else if (category === normalizedQuery) score -= 350;
  else if (category.includes(normalizedQuery)) score -= 250;
  else if (description.includes(normalizedQuery)) score -= 150;

  const nameWords = name.split(" ");
  const categoryWords = category.split(" ");
  const descriptionWords = description.split(" ");

  for (const word of queryWords) {
    if (nameWords.includes(word)) continue;
    if (nameWords.some((candidate) => candidate.startsWith(word))) score += 5;
    else if (name.includes(word)) score += 10;
    else if (categoryWords.includes(word)) score += 25;
    else if (categoryWords.some((candidate) => candidate.startsWith(word))) score += 30;
    else if (category.includes(word)) score += 35;
    else if (descriptionWords.includes(word)) score += 45;
    else if (descriptionWords.some((candidate) => candidate.startsWith(word))) score += 50;
    else score += 55;
  }

  return score;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`brand-mark ${dark ? "brand-mark-dark" : ""}`}>
      <img src="/favicon.png" alt="" />
      <span className="brand-mark-text">
        <span className="brand-mark-name">Deaf Shark</span>
        <span className="brand-mark-suffix">&nbsp;Coffee</span>
      </span>
    </span>
  );
}

export function CustomerHeader({ active, action }: { active?: string; action?: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    googleEnabled: false,
    emailEnabled: false,
    emailVerificationEnabled: false,
    passwordRecoveryEnabled: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [["/", "Home"], ["/menu", "Menu"], ["/about", "Our Story"], ["/events", "Events"], ["/contact", "Visit Us"], ["/employment", "Apply now"]];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authFirstName, setAuthFirstName] = useState("");
  const [authLastName, setAuthLastName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authBirthdayMonth, setAuthBirthdayMonth] = useState("");
  const [authBirthdayDay, setAuthBirthdayDay] = useState("");
  const [authPoliciesAccepted, setAuthPoliciesAccepted] = useState(false);
  const [authMarketingOptIn, setAuthMarketingOptIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [passwordFlow, setPasswordFlow] = useState<"credentials" | "request" | "reset">("credentials");
  const [resetToken, setResetToken] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchResultsContentRef = useRef<HTMLDivElement>(null);
  const searchResultsLenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (searchOpen || profileOpen) {
      document.body.classList.add("modal-open");
      (window as WindowWithLenis).__lenis?.stop();
    } else {
      if (!document.querySelector(".modal-backdrop, .drawer-backdrop")) {
        document.body.classList.remove("modal-open");
        (window as WindowWithLenis).__lenis?.start();
      }
    }
    return () => {
      if (!document.querySelector(".modal-backdrop, .drawer-backdrop")) {
        document.body.classList.remove("modal-open");
        (window as WindowWithLenis).__lenis?.start();
      }
    };
  }, [searchOpen, profileOpen]);

  async function openProfile() {
    setSearchOpen(false);
    setProfileOpen(true);
    setAuthError("");
    setAuthNotice("");
    // Show a usable sign-in form immediately. If a session exists, replace it
    // with the customer's profile as soon as the background request completes.
    setProfile((current) => current ?? { authenticated: false });

    const [profileResult, configResult] = await Promise.allSettled([
      fetchWithTimeout("/api/profile", { cache: "no-store", credentials: "include" }).then(async (response) => {
        if (!response.ok) throw new Error("Profile request failed");
        return response.json() as Promise<ProfileResponse>;
      }),
      fetchWithTimeout("/api/auth-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Authentication settings request failed");
        return response.json() as Promise<AuthConfig>;
      }),
    ]);

    if (profileResult.status === "fulfilled") {
      let nextProfile = profileResult.value;
      if (nextProfile.authenticated) {
        const pendingSignup = window.sessionStorage.getItem("deaf-shark-pending-signup");
        if (pendingSignup) {
          try {
            const onboardingResponse = await fetch("/api/profile/onboarding", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: pendingSignup,
            });
            if (onboardingResponse.ok) {
              window.sessionStorage.removeItem("deaf-shark-pending-signup");
              const refreshed = await fetchWithTimeout("/api/profile", { cache: "no-store", credentials: "include" });
              if (refreshed.ok) nextProfile = await refreshed.json() as ProfileResponse;
            }
          } catch {
            // Keep the pending profile locally and retry the next time the account opens.
          }
        }
      }
      setProfile(nextProfile);
      if (nextProfile.profile) {
        setProfileName(nextProfile.profile.displayName);
        setProfilePhone(nextProfile.profile.phone ?? "");
      }
    } else {
      setProfile({ authenticated: false });
      setAuthError("We could not load your saved profile. Please try opening your account again.");
    }

    if (configResult.status === "fulfilled") setAuthConfig(configResult.value);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("account") === "reset") {
      const token = params.get("token") ?? "";
      window.setTimeout(() => {
        setResetToken(token);
        setPasswordFlow("reset");
        void openProfile();
      }, 0);
    } else if (params.get("account") === "signin") {
      window.setTimeout(() => void openProfile(), 0);
    }
    // This deep link is used by the protected admin page.
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
    const wrapper = searchResultsRef.current;
    const content = searchResultsContentRef.current;
    if (reducedMotion || touchDevice || !wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      wheelMultiplier: 1,
      overscroll: false,
      autoRaf: true,
    });
    searchResultsLenisRef.current = lenis;

    return () => {
      searchResultsLenisRef.current = null;
      lenis.destroy();
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    if (searchResultsLenisRef.current) {
      searchResultsLenisRef.current.scrollTo(0, { immediate: true });
    } else if (searchResultsRef.current) {
      searchResultsRef.current.scrollTop = 0;
    }
  }, [query, searchOpen]);

  function requestedReturnTo() {
    const value = new URLSearchParams(window.location.search).get("returnTo") || "";
    return value.startsWith("/") && !value.startsWith("//") ? value : "";
  }

  async function handleGoogleSignIn() {
    if (!authConfig.googleEnabled) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: requestedReturnTo() ? `${window.location.origin}${requestedReturnTo()}` : window.location.href }),
      });
      const data = await response.json() as { url?: string; message?: string };
      if (!response.ok || !data.url) throw new Error(data.message || "Google sign-in could not start.");
      window.location.href = data.url;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign-in could not start.");
      setAuthBusy(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (authMode === "signup" && (!authFirstName.trim() || !authLastName.trim())) {
      setAuthError("Enter your first and last name to create your Deaf Shark account.");
      return;
    }
    if (!authEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim())) {
      setAuthError("Enter a complete email address, like you@example.com.");
      return;
    }
    if (authPassword.length < 8) {
      setAuthError("Your password needs at least 8 characters.");
      return;
    }
    if (authMode === "signup" && authPhone && authPhone.replace(/\D/g, "").length < 10) {
      setAuthError("Enter a complete phone number or leave it blank.");
      return;
    }
    if (authMode === "signup" && ((authBirthdayMonth && !authBirthdayDay) || (!authBirthdayMonth && authBirthdayDay))) {
      setAuthError("Choose both a birthday month and day, or leave both blank.");
      return;
    }
    if (authMode === "signup" && !authPoliciesAccepted) {
      setAuthError("Accept the Terms and Privacy Policy to create your account.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch(`/api/auth/${authMode === "signup" ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authMode === "signup"
          ? { name: `${authFirstName.trim()} ${authLastName.trim()}`, email: authEmail.trim(), password: authPassword, callbackURL: window.location.href }
          : { email: authEmail.trim(), password: authPassword, callbackURL: window.location.href }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "We could not complete that request.");
      if (authMode === "signup") {
        const pendingSignup = JSON.stringify({
          firstName: authFirstName.trim(),
          lastName: authLastName.trim(),
          phone: authPhone,
          birthdayMonth: authBirthdayMonth ? Number(authBirthdayMonth) : null,
          birthdayDay: authBirthdayDay ? Number(authBirthdayDay) : null,
          policiesAccepted: authPoliciesAccepted,
          marketingOptIn: authMarketingOptIn,
        });
        if (authConfig.emailVerificationEnabled) {
          window.sessionStorage.setItem("deaf-shark-pending-signup", pendingSignup);
          setAuthPassword("");
          setAuthMode("signin");
          setAuthNotice("Check your email and use the verification link to finish creating your account.");
          return;
        }
        const onboardingResponse = await fetch("/api/profile/onboarding", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: pendingSignup,
        });
        const onboardingData = await onboardingResponse.json() as { error?: string };
        if (!onboardingResponse.ok) throw new Error(onboardingData.error || "Your account was created, but your profile details could not be saved.");
      }
      setAuthPassword("");
      const returnTo = requestedReturnTo();
      if (returnTo) { window.location.href = returnTo; return; }
      await openProfile();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "We could not complete that request.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim())) {
      setAuthError("Enter the email address used for your account.");
      return;
    }
    setAuthBusy(true);
    try {
      const redirectTo = `${window.location.origin}/?account=reset`;
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), redirectTo }),
      });
      if (!response.ok) throw new Error("We could not start password recovery.");
      setAuthNotice("If that email has an account, a password-reset link is on its way.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "We could not start password recovery.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function completePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    if (!resetToken) {
      setAuthError("This password-reset link is invalid or has expired.");
      return;
    }
    if (authPassword.length < 8) {
      setAuthError("Your new password needs at least 8 characters.");
      return;
    }
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: authPassword }),
      });
      if (!response.ok) throw new Error("This password-reset link is invalid or has expired.");
      setAuthPassword("");
      setResetToken("");
      setPasswordFlow("credentials");
      setAuthMode("signin");
      setAuthNotice("Your password has been changed. You can sign in now.");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "We could not reset your password.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    setAuthBusy(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
      setProfile({ authenticated: false });
    } finally {
      setAuthBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage("");
    if (!profileName.trim()) {
      setProfileMessage("Enter the name you want shown on your account.");
      return;
    }
    if (profilePhone.replace(/\D/g, "").length < 10) {
      setProfileMessage("Enter a complete 10-digit mobile number.");
      return;
    }
    const response = await fetch("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: profileName, phone: profilePhone }),
    });
    const data = await response.json() as { error?: string; profile?: ProfileResponse["profile"] };
    if (!response.ok || !data.profile) {
      setProfileMessage(data.error || "Your profile could not be saved.");
      return;
    }
    setProfile({ authenticated: true, profile: data.profile });
    setProfileMessage("Saved.");
  }

  const normalizedQuery = normalizeSearchText(query);
  const searchMatches = normalizedQuery
    ? menuProducts
        .map((product, menuOrder) => ({ product, menuOrder, score: menuSearchScore(product, normalizedQuery) }))
        .filter((result): result is typeof result & { score: number } => result.score !== null)
        .sort((a, b) => a.score - b.score || a.menuOrder - b.menuOrder)
        .map(({ product }) => product)
    : menuProducts;

  const groupedSearchResults = {
    [normalizedQuery ? "Search results" : "Our Menu"]: searchMatches,
  };

  return (
    <>
      <header className="site-header">
        <nav aria-label="Primary navigation">{links.map(([href, label]) => <Link key={href} href={href} className={active === href ? "active" : ""}>{label}</Link>)}</nav>
        <Link className="header-brand" href="/" aria-label="Deaf Shark Coffee home"><BrandMark /></Link>
        <div className="header-action">
          <button className="header-icon-button" onClick={() => { setMobileMenuOpen(false); setSearchOpen((current) => !current); }} aria-label="Search menu">
            <svg className="header-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          {action ?? (
            <OrderOnlineLink className="header-cart header-cart-fallback" ariaLabel="Order online">
              <img src="/cart-icon-white.png" className="cart-glyph" alt="" aria-hidden="true" />
              <span aria-hidden="true">
                <svg className="header-order-arrow" viewBox="0 0 12 12" fill="none">
                  <path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </OrderOnlineLink>
          )}

          {/* Morphing Hamburger Button */}
          <button
            type="button"
            className={`nav-hamburger ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => {
              setSearchOpen(false);
              setProfileOpen(false);
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-takeover"
          >
            <span className="hamburger-box" aria-hidden="true">
              <span className="hamburger-line line-top" />
              <span className="hamburger-line line-mid" />
              <span className="hamburger-line line-bot" />
            </span>
          </button>

        </div>
      </header>

      {/* Full-Screen Takeover Mobile Navigation */}
      <div
        id="mobile-nav-takeover"
        className={`nav-fullscreen-takeover ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <ul className="nav-fs-links">
          {links.map(([href, label], idx) => {
            const isActive = active === href;
            return (
              <li key={href} style={{ "--delay": `${0.05 + idx * 0.045}s` } as React.CSSProperties}>
                <Link
                  href={href}
                  className={`nav-fs-link ${isActive ? "active" : ""}`}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="nav-fs-text">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Its own row between the links and the footer, so it sits evenly
            spaced between the last link and the social icons. */}
        <div className="nav-fs-cta-wrap">
          <OrderOnlineLink
            className="primary-button visit-order-btn nav-fs-cta"
            tabIndex={mobileMenuOpen ? 0 : -1}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Order now</span>
            <span className="btn-cart-glyph" aria-hidden="true" />
          </OrderOnlineLink>
        </div>

        <div className="nav-fs-footer">
          {/* Social Icons */}
          <div className="nav-fs-socials">
            <a
              href="https://www.instagram.com/deafsharkcoffee/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Deaf Shark Coffee on Instagram"
              className="nav-fs-social-btn"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a
              href="http://facebook.com/p/Deaf-Shark-Fishing-and-Coffee-100087250954811/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Deaf Shark Coffee on Facebook"
              className="nav-fs-social-btn"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@deafsharkcoffee"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Deaf Shark Coffee on TikTok"
              className="nav-fs-social-btn"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
              </svg>
            </a>
          </div>

          {/* Contact: Address, Phone & Email */}
          <div className="nav-fs-contact-info">
            <span className="nav-fs-address">900 Green Lane, Union NJ 07083</span>
            <div className="nav-fs-contact-links">
              <a href="tel:+19084818884" tabIndex={mobileMenuOpen ? 0 : -1}>(908) 481-8884</a>
              <span className="nav-fs-dot" aria-hidden="true">•</span>
              <a href="mailto:help@deafsharkcoffee.com" tabIndex={mobileMenuOpen ? 0 : -1}>help@deafsharkcoffee.com</a>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`search-backdrop ${searchOpen ? "is-open" : ""}`}
        role="button"
        tabIndex={-1}
        aria-label="Close search"
        aria-hidden={!searchOpen}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSearchOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "Enter" || event.key === " ") setSearchOpen(false);
        }}
      >
        <aside
          className="search-drawer"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-label="Search menu"
        >
          <div className="search-drawer-header">
            <h2>Search menu</h2>
            <button
              type="button"
              className="search-drawer-close"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="search-drawer-badge">
              <img src="/deafshark-logo-640.webp" alt="Deaf Shark emblem" decoding="async" />
            </div>
          </div>

          <div className="search-drawer-input-wrap">
            <span className="search-glyph" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search coffee, breakfast, sandwiches..."
              className="search-drawer-input"
              type="search"
              aria-label="Search the menu"
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery("")}
                aria-label="Clear search text"
              >
                ×
              </button>
            )}
          </div>

          <div ref={searchResultsRef} className="search-drawer-results">
            <div ref={searchResultsContentRef} className="search-drawer-results-content">
              {searchMatches.length > 0 ? (
                <div className="search-grouped-container">
                  {Object.entries(groupedSearchResults).map(([category, items]) => (
                    <div key={category} className="search-category-group">
                      <span className="search-results-heading">{category}</span>
                      <div className="search-results-list">
                        {items.map((product) => (
                          <a
                            key={product.id}
                            href={`/menu?item=${product.id}`}
                            className="search-result-item"
                            onClick={() => setSearchOpen(false)}
                          >
                            <div className="search-result-info">
                              <strong>{product.name}</strong>
                              <small>{product.description}</small>
                            </div>
                            <b className="search-result-price">${product.price.toFixed(2)}</b>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="search-empty-state">
                  <p>No menu items match “{query}”.</p>
                  <small>Try searching for Latte, Empanada, Horchata, or Sandwich.</small>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      {profileOpen && (
        <div
          className="account-backdrop"
          role="button"
          tabIndex={-1}
          aria-label="Close customer account"
          onClick={(event) => {
            if (event.target === event.currentTarget) setProfileOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") setProfileOpen(false);
          }}
        >
          <section className="account-modal" data-auth-mode={profile?.authenticated ? "profile" : authMode} data-lenis-prevent role="dialog" aria-modal="true" aria-label="Customer account">
            <button className="account-close" onClick={() => setProfileOpen(false)} aria-label="Close account">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
            <img src="/favicon.png" alt="" />
            {!profile && <><h2>Opening your account...</h2><p>Loading your Deaf Shark profile and loyalty points.</p></>}
            {profile && !profile.authenticated && (
              <>
                <h2>{passwordFlow === "reset" ? "Choose a new password" : passwordFlow === "request" ? "Reset your password" : "Sign in or create your account"}</h2>
                <p>{passwordFlow === "reset" ? "Enter a new password for your Deaf Shark Coffee account." : passwordFlow === "request" ? "We will email you a secure, one-hour reset link." : "Create your free account to receive 25 welcome points and a one-time 50% off coffee offer for your next in-store visit."}</p>

                {passwordFlow === "credentials" && <div className="social-auth-buttons">
                  <button
                    type="button"
                    className="social-auth-btn social-google"
                    onClick={handleGoogleSignIn}
                    disabled={!authConfig.googleEnabled || authBusy}
                    title={authConfig.googleEnabled ? undefined : "Google sign-in will be enabled when the business account is connected."}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>{authConfig.googleEnabled ? "Continue with Google" : "Google sign-in — setup pending"}</span>
                  </button>
                </div>}

                {passwordFlow === "credentials" && authConfig.emailEnabled && <div className="auth-divider">
                  <span>or continue with email</span>
                </div>}

                {passwordFlow === "credentials" && authConfig.emailEnabled && <form className="auth-email-form" onSubmit={handleEmailSignIn} noValidate>
                  {authMode === "signup" && (
                    <>
                      <div className="auth-field-row">
                        <input
                          type="text"
                          maxLength={40}
                          value={authFirstName}
                          onChange={(e) => setAuthFirstName(e.target.value)}
                          placeholder="First name"
                          aria-label="First name"
                          autoComplete="given-name"
                          className="auth-email-input"
                        />
                        <input
                          type="text"
                          maxLength={40}
                          value={authLastName}
                          onChange={(e) => setAuthLastName(e.target.value)}
                          placeholder="Last name"
                          aria-label="Last name"
                          autoComplete="family-name"
                          className="auth-email-input"
                        />
                      </div>
                      <input
                        type="tel"
                        maxLength={24}
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="Mobile number (optional)"
                        aria-label="Mobile number, optional"
                        autoComplete="tel"
                        className="auth-email-input"
                      />
                      <fieldset className="auth-birthday-fieldset">
                        <legend>Birthday for your annual reward <span>(optional)</span></legend>
                        <div className="auth-field-row">
                          <select value={authBirthdayMonth} onChange={(e) => { setAuthBirthdayMonth(e.target.value); setAuthBirthdayDay(""); }} aria-label="Birthday month" className="auth-email-input">
                            <option value="">Month</option>
                            {[["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"], ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"], ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select value={authBirthdayDay} onChange={(e) => setAuthBirthdayDay(e.target.value)} aria-label="Birthday day" className="auth-email-input" disabled={!authBirthdayMonth}>
                            <option value="">Day</option>
                            {Array.from({ length: authBirthdayMonth ? new Date(2000, Number(authBirthdayMonth), 0).getDate() : 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}
                          </select>
                        </div>
                      </fieldset>
                    </>
                  )}
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    className="auth-email-input"
                  />
                  <div className="auth-password-field">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      minLength={8}
                      maxLength={128}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password (8 characters minimum)"
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                      className="auth-email-input"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setPasswordVisible((current) => !current)}
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                      aria-pressed={passwordVisible}
                      title={passwordVisible ? "Hide password" : "Show password"}
                    >
                      {passwordVisible ? (
                        /* eye with a slash through it */
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                          <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.4 3.3" />
                          <path d="M6.2 6.9C3.9 8.4 3 10.6 3 12c0 2.5 4 7 9 7a9.6 9.6 0 003.6-.7" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
                          <circle cx="12" cy="12" r="2.6" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {authMode === "signup" && <p className="auth-password-guidance">Use at least 8 characters. A longer, unique password is safer.</p>}
                  {authMode === "signup" && (
                    <div className="auth-consents">
                      <label>
                        <input type="checkbox" checked={authPoliciesAccepted} onChange={(e) => setAuthPoliciesAccepted(e.target.checked)} />
                        <span>I agree to the <Link href="/terms" target="_blank">Terms</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>. <b>Required</b></span>
                      </label>
                      <label>
                        <input type="checkbox" checked={authMarketingOptIn} onChange={(e) => setAuthMarketingOptIn(e.target.checked)} />
                        <span>Send me Deaf Shark news, offers, and event updates. I can unsubscribe at any time. <b>Optional</b></span>
                      </label>
                    </div>
                  )}
                  <button type="submit" className="primary-button auth-email-btn">
                    {authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in with email"}
                  </button>
                </form>}
                {passwordFlow === "request" && authConfig.passwordRecoveryEnabled && (
                  <form className="auth-email-form" onSubmit={requestPasswordReset} noValidate>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Enter your email address" autoComplete="email" className="auth-email-input" />
                    <button type="submit" className="primary-button auth-email-btn" disabled={authBusy}>{authBusy ? "Sending..." : "Email reset link"}</button>
                  </form>
                )}
                {passwordFlow === "reset" && (
                  <form className="auth-email-form" onSubmit={completePasswordReset} noValidate>
                    <div className="auth-password-field">
                      <input type={passwordVisible ? "text" : "password"} minLength={8} maxLength={128} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="New password (8 characters minimum)" autoComplete="new-password" className="auth-email-input" />
                      <button type="button" className="auth-password-toggle" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible}>Show</button>
                    </div>
                    <button type="submit" className="primary-button auth-email-btn" disabled={authBusy}>{authBusy ? "Saving..." : "Save new password"}</button>
                  </form>
                )}
                {authError && <p className="account-form-message error" role="alert">{authError}</p>}
                {authNotice && <p className="account-form-message" role="status">{authNotice}</p>}
                {passwordFlow === "credentials" && authConfig.emailEnabled && <button type="button" className="account-mode-toggle" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); setAuthNotice(""); }}>
                  {authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>}
                {passwordFlow === "credentials" && authMode === "signin" && authConfig.passwordRecoveryEnabled && <button type="button" className="account-mode-toggle" onClick={() => { setPasswordFlow("request"); setAuthError(""); setAuthNotice(""); }}>Forgot your password?</button>}
                {passwordFlow !== "credentials" && <button type="button" className="account-mode-toggle" onClick={() => { setPasswordFlow("credentials"); setAuthError(""); setAuthNotice(""); }}>Back to sign in</button>}
                {!authConfig.googleEnabled && !authConfig.emailEnabled && <small>Customer accounts are temporarily unavailable while secure sign-in is being connected.</small>}
                {authConfig.emailEnabled && <small>Email accounts require verification. Password recovery links expire after one hour.</small>}
              </>
            )}
            {profile?.authenticated && profile.profile && (
              <>
                <span className="account-welcome">Welcome back</span>
                <h2>{profile.profile.displayName}</h2>
                <p>{profile.profile.email}</p>
                <div className="loyalty-card">
                  <span>Deaf Shark Rewards</span>
                  <strong>{profile.profile.points} points</strong>
                  <div><i style={{ width: `${Math.min(100, profile.profile.points)}%` }} /></div>
                  <small>{Math.max(0, 100 - profile.profile.points)} points until your next $5 reward</small>
                </div>
                <p className="loyalty-note">Your 25-point welcome bonus is ready. Purchase-point earning will begin when the store connection is enabled.</p>
                {profile.profile.welcomeOffer && (
                  <div className={`welcome-offer welcome-offer-${profile.profile.welcomeOffer.status}`}>
                    <span>{profile.profile.welcomeOffer.status === "active" ? "New member offer" : "Offer used"}</span>
                    <strong>50% off one coffee</strong>
                    <p>{profile.profile.welcomeOffer.status === "active" ? "Show this barcode to a team member when ordering in store." : "This one-time welcome offer has been redeemed."}</p>
                    <OfferBarcode value={profile.profile.welcomeOffer.code} />
                    <small>In store only · One prepared coffee drink · Base drink only · Cannot be combined with another offer</small>
                  </div>
                )}
                {profile.profile.activity && profile.profile.activity.length > 0 && (
                  <div className="account-points-activity">
                    <strong>Recent points</strong>
                    {profile.profile.activity.slice(0, 3).map((entry) => <div key={entry.id}><span>{entry.reason === "completed_order" ? "Completed order" : entry.reason === "signup_bonus" ? "Welcome bonus" : entry.reason.replace(/^staff_adjustment:/, "Staff adjustment: ")}</span><b className={entry.pointsChange >= 0 ? "points-positive" : "points-negative"}>{entry.pointsChange >= 0 ? "+" : ""}{entry.pointsChange}</b></div>)}
                  </div>
                )}
                <form className="account-profile-form" onSubmit={saveProfile} noValidate>
                  <label>Name<input value={profileName} onChange={(e) => { setProfileName(e.target.value); setProfileMessage(""); }} maxLength={80} autoComplete="name" /></label>
                  <label>Mobile number<input value={profilePhone} onChange={(e) => { setProfilePhone(e.target.value); setProfileMessage(""); }} type="tel" autoComplete="tel" placeholder="Used to find your rewards in store" /></label>
                  <button type="submit" className="primary-button">Save profile</button>
                  {profileMessage && <small className={`account-form-message${profileMessage === "Saved." ? "" : " error"}`} role="status">{profileMessage}</small>}
                </form>
                <button type="button" className="account-signout" onClick={handleSignOut} disabled={authBusy}>
                  Sign out
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Top Newsletter / Club Section */}
        <div className="footer-newsletter">
          <div className="newsletter-copy">
            <h2>Join the club!</h2>
            <p>A free upgrade on your birthday, early access to new roasts, and invites to coffee tastings in Union.</p>
          </div>
          <div className="newsletter-form-wrap">
            <div className="newsletter-coming-soon-wrapper">
              <span className="newsletter-coming-soon-badge" aria-hidden="true">Coming soon!</span>
              <form className="newsletter-form newsletter-disabled" onSubmit={(e) => e.preventDefault()} noValidate aria-disabled="true">
                <label htmlFor="footer-email">E-MAIL</label>
                <div className="newsletter-input-row is-disabled">
                  <input
                    id="footer-email"
                    type="email"
                    value=""
                    readOnly
                    disabled
                    tabIndex={-1}
                    placeholder="you@example.com"
                    aria-label="Email address (newsletter coming soon)"
                  />
                  <button type="button" disabled tabIndex={-1} aria-disabled="true">
                    Join <span>→</span>
                  </button>
                </div>
                <label className="newsletter-consent is-disabled">
                  <input
                    type="checkbox"
                    disabled
                    readOnly
                    tabIndex={-1}
                    aria-disabled="true"
                  />
                  <span>I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.</span>
                </label>
              </form>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        {/* 4-Column Navigation Section */}
        <div className="footer-columns">
          <div className="footer-col footer-col-brand">
            <Link
              className="footer-logo"
              href="/"
              aria-label="Deaf Shark Coffee, back to the top of the home page"
              onClick={(event) => {
                if (window.location.pathname !== "/") return;
                event.preventDefault();
                const lenis = (window as WindowWithLenis).__lenis;
                if (lenis) lenis.scrollTo(0, { duration: 1.1 });
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <img src="/favicon.png" alt="" />
              <span>DEAF SHARK COFFEE</span>
            </Link>
            <p className="footer-tagline">One Farm. One Variety.<br />Roasted in Union, NJ.</p>
            <div className="footer-socials">
              <a
                href="https://www.instagram.com/deafsharkcoffee/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Deaf Shark on Instagram"
                className="footer-social-icon"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a
                href="http://facebook.com/p/Deaf-Shark-Fishing-and-Coffee-100087250954811/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Deaf Shark on Facebook"
                className="footer-social-icon"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@deafsharkcoffee"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Deaf Shark on TikTok"
                className="footer-social-icon"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>MENU</h4>
            <ul>
              <li><a href="/menu#menu-cat-coffee">Our Coffee</a></li>
              <li><a href="/menu#menu-cat-matcha">Matcha &amp; Tea</a></li>
              <li><a href="/menu#menu-cat-breakfast">Sandwiches &amp; Breakfast</a></li>
              <li><a href="/menu#menu-cat-coffee-beans">Our Own Roast</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>SITEMAP</h4>
            <ul>
              <li><a href="/employment">Apply now</a></li>
              <li><a href="/about">Our Story</a></li>
              <li><a href="/events">Events</a></li>
              <li><Link href="/">Home</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>SERVICE &amp; VISIT</h4>
            <ul>
              <li><a href="/contact">Catering &amp; Inquiries</a></li>
              <li><a href="/contact">Location &amp; Hours</a></li>
              <li><a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get Directions ↗</a></li>
              <li><a href="tel:9084818884">(908) 481-8884</a></li>
              <li><a href="mailto:help@deafsharkcoffee.com">help@deafsharkcoffee.com</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Deaf Shark Coffee · Roasted in Union, New Jersey</span>
          <div className="footer-legal">
            <a href="/contact">Contact</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/dashboard">Staff Dashboard</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
