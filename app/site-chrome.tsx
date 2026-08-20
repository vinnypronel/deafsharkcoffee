"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { menuProducts } from "./menu-data";

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
type ProfileResponse = { authenticated: boolean; profile?: { displayName: string; email: string; points: number }; signInPath?: string; signOutPath?: string };

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
    if (!reference) { setOrder(null); return; }
    let activeRequest = true;
    async function refresh() {
      try {
        const response = await fetch("/api/customer-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reference), cache: "no-store" });
        if (response.status === 404 || response.status === 400) {
          try {
            const currentList = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedOrder[];
            const remaining = currentList.filter((item) => item.orderNumber !== reference.orderNumber);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
            window.dispatchEvent(new Event("deaf-shark-orders-updated"));
          } catch {}
          setReference(null);
          setOrder(null);
          setOpen(false);
          return;
        }
        const data = await response.json();
        if (response.ok && activeRequest) {
          const ord = data.order;
          if (!ord || ord.status === "complete" || ord.status === "completed" || ord.status === "cancelled" || ord.status === "picked_up") {
            try {
              const currentList = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedOrder[];
              const remaining = currentList.filter((item) => item.orderNumber !== reference.orderNumber);
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
    try {
      const saved = window.localStorage.getItem("deaf-shark-local-profile");
      if (saved) {
        setProfile(JSON.parse(saved));
        return;
      }
    } catch {}
    setProfile(null);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      setProfile(await response.json());
    } catch {
      setProfile({ authenticated: false });
    }
  }

  function handleSocialSignIn(provider: string) {
    const newProfile = {
      authenticated: true,
      profile: {
        displayName: `${provider} Customer`,
        email: `${provider.toLowerCase()}.user@example.com`,
        points: 40,
      },
    };
    try {
      window.localStorage.setItem("deaf-shark-local-profile", JSON.stringify(newProfile));
    } catch {}
    setProfile(newProfile);
  }

  function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!authEmail.trim()) return;
    const namePart = authEmail.split("@")[0];
    const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const newProfile = {
      authenticated: true,
      profile: {
        displayName: capitalized,
        email: authEmail.trim(),
        points: 25,
      },
    };
    try {
      window.localStorage.setItem("deaf-shark-local-profile", JSON.stringify(newProfile));
    } catch {}
    setProfile(newProfile);
  }

  function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    try {
      window.localStorage.removeItem("deaf-shark-local-profile");
    } catch {}
    if (profile?.signOutPath) {
      window.location.href = profile.signOutPath;
    } else {
      setProfile({ authenticated: false });
    }
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
          <button className="header-icon-button" onClick={() => { setOpen(false); setSearchOpen((current) => !current); }} aria-label="Search menu">
            <svg className="header-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button className="header-icon-button" onClick={openProfile} aria-label="Open profile">
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
          {action ?? <a className="header-order-link" href="/menu">Order now</a>}
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
      <nav className="mobile-site-nav" aria-label="Mobile navigation">{links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}</nav>

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
                <p>Use one secure account to order faster, follow pickups, and earn Deaf Shark loyalty points.</p>

                <div className="social-auth-buttons">
                  <button
                    type="button"
                    className="social-auth-btn social-google"
                    onClick={() => handleSocialSignIn("Google")}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    className="social-auth-btn social-apple"
                    onClick={() => handleSocialSignIn("Apple")}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.93.04-2.03.62-2.67 1.37-.56.65-1.06 1.71-.93 2.74 1.03.08 2.06-.54 2.59-1.24z" />
                    </svg>
                    <span>Continue with Apple</span>
                  </button>

                  <button
                    type="button"
                    className="social-auth-btn social-facebook"
                    onClick={() => handleSocialSignIn("Facebook")}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Continue with Facebook</span>
                  </button>
                </div>

                <div className="auth-divider">
                  <span>or continue with email</span>
                </div>

                <form className="auth-email-form" onSubmit={handleEmailSignIn}>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="auth-email-input"
                  />
                  <button type="submit" className="primary-button auth-email-btn">
                    Continue with Email
                  </button>
                </form>

                <small>Your account is created automatically the first time you continue.</small>
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
                <p className="loyalty-note">Earn one point for every dollar spent on signed-in orders.</p>
                <button type="button" className="account-signout" onClick={handleSignOut}>
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

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
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
          <div className="footer-newsletter-badge" aria-hidden="true">
            <img src="/deafshark-logo.png" alt="Deaf Shark Coffee circular emblem" />
          </div>
          <div className="newsletter-form-wrap">
            {subscribed ? (
              <p className="newsletter-success">✓ You&#39;re in! We&#39;ll send your welcome perks soon.</p>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe}>
                <label htmlFor="footer-email">E-MAIL</label>
                <div className="newsletter-input-row">
                  <input
                    id="footer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <button type="submit">Join <span>→</span></button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="footer-divider" />

        {/* 4-Column Navigation Section */}
        <div className="footer-columns">
          <div className="footer-col footer-col-brand">
            <div className="footer-logo">
              <img src="/favicon.png" alt="" />
              <span>DEAF SHARK COFFEE</span>
            </div>
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
              <li><a href="/menu">Hot Classics</a></li>
              <li><a href="/menu">Coffee Beans</a></li>
              <li><a href="/menu">Cold Brew &amp; Iced</a></li>
              <li><a href="/menu">Breakfast &amp; Sandwiches</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>CLUB &amp; STORY</h4>
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
            <a href="/dashboard">Staff Dashboard</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
