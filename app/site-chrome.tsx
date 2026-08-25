"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { menuProducts } from "./menu-data";
import { OfferBarcode } from "./offer-barcode";

type SavedOrder = { orderNumber: string; phone: string };
type HeaderOrder = {
  orderNumber: string;
  status: string;
  pickupEta: string;
  totalCents: number;
  items: { name: string; quantity: number }[];
};

const STORAGE_KEY = "deaf-shark-customer-orders";
const statusLabels: Record<string, string> = { new: "Received", preparing: "Preparing", ready: "Ready for pickup", complete: "Completed", cancelled: "Cancelled" };
type ProfileResponse = { authenticated: boolean; profile?: { displayName: string; email: string; phone?: string | null; points: number; lifetimePoints: number; activity?: Array<{ id: number; pointsChange: number; balanceAfter: number; reason: string; createdAt: string }>; welcomeOffer?: { id: number; code: string; status: string; issuedAt: string; redeemedAt?: string | null } | null } };
type AuthConfig = { googleEnabled: boolean; emailEnabled: boolean; emailVerificationEnabled: boolean };

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function latestSavedOrder(): SavedOrder | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedOrder[];
    return saved[0] ?? null;
  } catch {
    return null;
  }
}

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return <span className={`brand-mark ${dark ? "brand-mark-dark" : ""}`}><img src="/favicon.png" alt="" /><span>Deaf Shark Coffee</span></span>;
}

export function CustomerHeader({ active, action }: { active?: string; action?: ReactNode }) {
  const [reference, setReference] = useState<SavedOrder | null>(null);
  const [order, setOrder] = useState<HeaderOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    googleEnabled: false,
    emailEnabled: true,
    emailVerificationEnabled: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [["/", "Home"], ["/menu", "Menu"], ["/about", "Our Story"], ["/events", "Events"], ["/contact", "Visit Us"], ["/employment", "Apply now"]];
  const loadReference = useCallback(() => setReference(latestSavedOrder()), []);

  useEffect(() => {
    loadReference();
    const update = () => loadReference();
    const openOrder = () => { loadReference(); setOpen(true); };
    window.addEventListener("storage", update);
    window.addEventListener("deaf-shark-orders-updated", update);
    window.addEventListener("deaf-shark-open-order", openOrder);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("deaf-shark-orders-updated", update);
      window.removeEventListener("deaf-shark-open-order", openOrder);
    };
  }, [loadReference]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!reference) { setOrder(null); return; }
    const savedReference = reference;
    let activeRequest = true;
    async function refresh() {
      try {
        const response = await fetch("/api/customer-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(savedReference), cache: "no-store" });
        if (response.status === 404 || response.status === 400) {
          try {
            const currentList = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedOrder[];
            const remaining = currentList.filter((item) => item.orderNumber !== savedReference.orderNumber);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
            window.dispatchEvent(new Event("deaf-shark-orders-updated"));
          } catch {}
          setReference(null);
          setOrder(null);
          setOpen(false);
          return;
        }
        const data = await response.json() as { order?: HeaderOrder | null };
        if (response.ok && activeRequest) {
          const ord = data.order;
          if (!ord || ord.status === "complete" || ord.status === "completed" || ord.status === "cancelled" || ord.status === "picked_up") {
            try {
              const currentList = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedOrder[];
              const remaining = currentList.filter((item) => item.orderNumber !== savedReference.orderNumber);
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
              window.dispatchEvent(new Event("deaf-shark-orders-updated"));
            } catch {}
            setReference(null);
            setOrder(null);
            setOpen(false);
          } else {
            setOrder(ord);
          }
        }
      } catch {
        // Keep the last known state if the network briefly drops.
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { activeRequest = false; window.clearInterval(timer); };
  }, [reference]);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    if (searchOpen || profileOpen) {
      document.body.classList.add("modal-open");
      (window as any).__lenis?.stop();
    } else {
      if (!document.querySelector(".modal-backdrop, .drawer-backdrop")) {
        document.body.classList.remove("modal-open");
        (window as any).__lenis?.start();
      }
    }
    return () => {
      if (!document.querySelector(".modal-backdrop, .drawer-backdrop")) {
        document.body.classList.remove("modal-open");
        (window as any).__lenis?.start();
      }
    };
  }, [searchOpen, profileOpen]);

  async function openProfile() {
    setSearchOpen(false);
    setProfileOpen(true);
    setAuthError("");
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
      const nextProfile = profileResult.value;
      setProfile(nextProfile);
      if (nextProfile.profile) {
        setProfileName(nextProfile.profile.displayName);
        setProfilePhone(nextProfile.profile.phone ?? "");
      }
    } else {
      setProfile({ authenticated: false });
      setAuthError("We could not load your saved profile. You can still sign in or create an account below.");
    }

    if (configResult.status === "fulfilled") setAuthConfig(configResult.value);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("account") === "signin") openProfile();
    // This deep link is used by the protected admin page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (authMode === "signup" && !authName.trim()) {
      setAuthError("Enter your name to create your Deaf Shark account.");
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
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch(`/api/auth/${authMode === "signup" ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authMode === "signup"
          ? { name: authName.trim(), email: authEmail.trim(), password: authPassword, callbackURL: window.location.href }
          : { email: authEmail.trim(), password: authPassword, callbackURL: window.location.href }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "We could not complete that request.");
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

  const searchMatches = query.trim()
    ? menuProducts.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    : menuProducts.filter((product) => product.popular).slice(0, 5);

  const groupedSearchResults = query.trim()
    ? searchMatches.reduce((acc, product) => {
        const cat = product.category || "Menu Items";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(product);
        return acc;
      }, {} as Record<string, typeof menuProducts>)
    : { "Popular right now": searchMatches };

  return (
    <>
      <header className="site-header">
        <nav aria-label="Primary navigation">{links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}</nav>
        <a className="header-brand" href="/" aria-label="Deaf Shark Coffee home"><BrandMark /></a>
        <div className="header-action">
          <button className="header-icon-button" onClick={() => { setOpen(false); setMobileMenuOpen(false); setSearchOpen((current) => !current); }} aria-label="Search menu">
            <svg className="header-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button className="header-icon-button" onClick={() => { setMobileMenuOpen(false); openProfile(); }} aria-label="Open profile">
            <svg className="header-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          {order && (order.status === "new" || order.status === "preparing" || order.status === "ready") && (
            <button className={`order-status-trigger ${order.status === "ready" ? "ready" : ""}`} onClick={() => setOpen((current) => !current)}>
              <span>{order.status === "ready" ? "Ready" : "Order status"}</span>
              <i />
            </button>
          )}
          {action ?? (
            <a className="header-cart header-cart-fallback" href="/menu" aria-label="View cart and menu">
              <img src="/cart-icon-white.png" className="cart-glyph" alt="" aria-hidden="true" />
              <span>0</span>
            </a>
          )}

          {/* Morphing Hamburger Button */}
          <button
            type="button"
            className={`nav-hamburger ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => {
              setOpen(false);
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

          {open && order && (order.status === "new" || order.status === "preparing" || order.status === "ready") && (
            <section className="header-order-popover" aria-label="Current order status">
              <button className="popover-close" onClick={() => setOpen(false)} aria-label="Close order status">×</button>
              <span className="eyebrow">Current pickup</span>
              <div className="popover-order-title"><h2>{order.orderNumber}</h2><span className={`customer-status status-${order.status}`}>{statusLabels[order.status]}</span></div>
              <p>{order.status === "ready" ? "Your order is ready at the counter." : `Estimated pickup: ${order.pickupEta}`}</p>
              <div className="popover-items">{order.items.slice(0, 3).map((item, index) => <span key={`${item.name}-${index}`}>{item.quantity}× {item.name}</span>)}</div>
              <div className="popover-total"><span>Total</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div>
            </section>
          )}
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
                <a
                  href={href}
                  className={`nav-fs-link ${isActive ? "active" : ""}`}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="nav-fs-text">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav-fs-footer">
          <a
            className="primary-button hero-cta-btn nav-fs-cta"
            href="/menu"
            tabIndex={mobileMenuOpen ? 0 : -1}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Order pickup</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

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
              <a href="mailto:deafsharkcoffee@gmail.com" tabIndex={mobileMenuOpen ? 0 : -1}>deafsharkcoffee@gmail.com</a>
            </div>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="search-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <aside
            className="search-drawer"
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label="Search menu"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="search-drawer-header">
              <h2>Search menu</h2>
              <div className="search-drawer-badge">
                <img src="/deafshark-logo.png" alt="Deaf Shark emblem" />
              </div>
              <button
                type="button"
                className="search-drawer-close"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="search-drawer-input-wrap">
              <span className="search-glyph" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search coffee, breakfast, sandwiches..."
                className="search-drawer-input"
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

            <div className="search-drawer-results">
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
          </aside>
        </div>
      )}
      {profileOpen && (
        <div className="account-backdrop" onMouseDown={() => setProfileOpen(false)}>
          <section className="account-modal" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Customer account" onMouseDown={(event) => event.stopPropagation()}>
            <button className="account-close" onClick={() => setProfileOpen(false)} aria-label="Close account">×</button>
            <img src="/favicon.png" alt="" />
            {!profile && <><h2>Opening your account...</h2><p>Loading your Deaf Shark profile and loyalty points.</p></>}
            {profile && !profile.authenticated && (
              <>
                <h2>Sign in or create your account</h2>
                <p>Create your free account to receive 25 welcome points and a one-time 50% off coffee offer for your next in-store visit.</p>

                <div className="social-auth-buttons">
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
                </div>

                <div className="auth-divider">
                  <span>or continue with email</span>
                </div>

                <form className="auth-email-form" onSubmit={handleEmailSignIn} noValidate>
                  {authMode === "signup" && (
                    <input
                      type="text"
                      maxLength={80}
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className="auth-email-input"
                    />
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
                  <button type="submit" className="primary-button auth-email-btn">
                    {authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in with email"}
                  </button>
                </form>
                {authError && <p className="account-form-message error" role="alert">{authError}</p>}
                <button type="button" className="account-mode-toggle" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>
                  {authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>
                <small>Email verification and password recovery will be enabled before public launch.</small>
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
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterFieldErrors, setNewsletterFieldErrors] = useState<{ email?: string; consent?: string }>({});

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setNewsletterError("");
    const trimmedEmail = email.trim();
    const fieldErrors: { email?: string; consent?: string } = {};
    if (!trimmedEmail) fieldErrors.email = "Enter your email address to join the club.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) fieldErrors.email = "Enter a complete email address, like you@example.com.";
    if (!newsletterConsent) fieldErrors.consent = "Please agree before joining the email list.";
    setNewsletterFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setNewsletterBusy(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, consent: newsletterConsent }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "We could not save your subscription.");
      setSubscribed(true);
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : "We could not save your subscription.");
    } finally {
      setNewsletterBusy(false);
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Top Newsletter / Club Section */}
        <div className="footer-newsletter">
          <div className="newsletter-copy">
            <h2>Join the club.</h2>
            <p>A free upgrade on your birthday, early access to new roasts, and invites to coffee tastings in Union.</p>
          </div>
          <div className="newsletter-form-wrap">
            {subscribed ? (
              <p className="newsletter-success">✓ You&#39;re in! We&#39;ll send your welcome perks soon.</p>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe} noValidate>
                <label htmlFor="footer-email">E-MAIL</label>
                <div className={`newsletter-input-row${newsletterFieldErrors.email ? " has-error" : ""}`}>
                  <input
                    id="footer-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (newsletterFieldErrors.email) setNewsletterFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    placeholder="you@example.com"
                    aria-invalid={newsletterFieldErrors.email ? true : undefined}
                    aria-describedby={newsletterFieldErrors.email ? "footer-email-error" : undefined}
                  />
                  <button type="submit" disabled={newsletterBusy}>{newsletterBusy ? "Saving" : "Join"} <span>→</span></button>
                </div>
                {newsletterFieldErrors.email && <p className="newsletter-field-error" id="footer-email-error" role="alert"><span aria-hidden="true">!</span>{newsletterFieldErrors.email}</p>}
                <label className={`newsletter-consent${newsletterFieldErrors.consent ? " has-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(event) => {
                      setNewsletterConsent(event.target.checked);
                      if (newsletterFieldErrors.consent) setNewsletterFieldErrors((current) => ({ ...current, consent: undefined }));
                    }}
                    aria-invalid={newsletterFieldErrors.consent ? true : undefined}
                    aria-describedby={newsletterFieldErrors.consent ? "footer-consent-error" : undefined}
                  />
                  <span>I agree to receive Deaf Shark Coffee news and promotions by email. I can unsubscribe at any time.</span>
                </label>
                {newsletterFieldErrors.consent && <p className="newsletter-field-error" id="footer-consent-error" role="alert"><span aria-hidden="true">!</span>{newsletterFieldErrors.consent}</p>}
                {newsletterError && <p className="newsletter-error" role="alert">{newsletterError}</p>}
                {newsletterBusy && <p className="newsletter-status" role="status">Saving your subscription...</p>}
              </form>
            )}
          </div>
        </div>

        <div className="footer-divider" />

        {/* 4-Column Navigation Section */}
        <div className="footer-columns">
          <div className="footer-col footer-col-brand">
            <a
              className="footer-logo"
              href="/"
              aria-label="Deaf Shark Coffee, back to the top of the home page"
              onClick={(event) => {
                if (window.location.pathname !== "/") return;
                event.preventDefault();
                const lenis = (window as unknown as { __lenis?: { scrollTo: (target: number, options?: Record<string, unknown>) => void } }).__lenis;
                if (lenis) lenis.scrollTo(0, { duration: 1.1 });
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <img src="/favicon.png" alt="" />
              <span>DEAF SHARK COFFEE</span>
            </a>
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
              <li><a href="/">Home</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>SERVICE &amp; VISIT</h4>
            <ul>
              <li><a href="/contact">Catering &amp; Inquiries</a></li>
              <li><a href="/contact">Location &amp; Hours</a></li>
              <li><a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get Directions ↗</a></li>
              <li><a href="tel:9084818884">(908) 481-8884</a></li>
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
