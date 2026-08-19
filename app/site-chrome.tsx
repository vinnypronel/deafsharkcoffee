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
  const links = [["/", "Home"], ["/menu", "Menu"], ["/about", "Our Story"], ["/events", "Events"], ["/contact", "Visit Us"], ["/employment", "Employment"]];
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
        const data = await response.json();
        if (response.ok && activeRequest) setOrder(data.order);
      } catch {
        // Keep the last known state if the network briefly drops.
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { activeRequest = false; window.clearInterval(timer); };
  }, [reference]);

  async function openProfile() {
    setSearchOpen(false);
    setProfileOpen(true);
    setProfile(null);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      setProfile(await response.json());
    } catch {
      setProfile({ authenticated: false, signInPath: "/signin-with-chatgpt?return_to=%2F" });
    }
  }

  const searchResults = query.trim()
    ? menuProducts.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : menuProducts.filter((product) => product.popular).slice(0, 5);

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
          {reference && <button className={`order-status-trigger ${order?.status === "ready" ? "ready" : ""}`} onClick={() => setOpen((current) => !current)}><span>{order?.status === "ready" ? "Ready" : "Order status"}</span><i /></button>}
          {action ?? <a className="header-order-link" href="/menu">Order now</a>}
          {searchOpen && (
            <section className="header-search-panel" aria-label="Search the menu">
              <div className="search-field"><span className="search-glyph" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coffee, breakfast, sandwiches..." /><button onClick={() => setSearchOpen(false)} aria-label="Close search">×</button></div>
              <div className="search-results"><span>{query ? "Search results" : "Popular right now"}</span>{searchResults.length ? searchResults.map((product) => <a key={product.id} href={`/menu?item=${product.id}`}><div><strong>{product.name}</strong><small>{product.category}</small></div><b>${product.price.toFixed(2)}</b></a>) : <p>No menu items match that search.</p>}</div>
            </section>
          )}
          {open && reference && (
            <section className="header-order-popover" aria-label="Current order status">
              <button className="popover-close" onClick={() => setOpen(false)} aria-label="Close order status">×</button>
              <span className="eyebrow">Current pickup</span>
              <div className="popover-order-title"><h2>{order?.orderNumber ?? reference.orderNumber}</h2><span className={`customer-status status-${order?.status ?? "new"}`}>{statusLabels[order?.status ?? "new"]}</span></div>
              {order ? <><p>{order.status === "ready" ? "Your order is ready at the counter." : `Estimated pickup: ${order.pickupEta}`}</p><div className="popover-items">{order.items.slice(0, 3).map((item, index) => <span key={`${item.name}-${index}`}>{item.quantity}× {item.name}</span>)}</div><div className="popover-total"><span>Total</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div></> : <p>Loading your latest order...</p>}
            </section>
          )}
        </div>
      </header>
      <nav className="mobile-site-nav" aria-label="Mobile navigation">{links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}</nav>
      {profileOpen && (
        <div className="account-backdrop" onMouseDown={() => setProfileOpen(false)}>
          <section className="account-modal" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Customer account" onMouseDown={(event) => event.stopPropagation()}>
            <button className="account-close" onClick={() => setProfileOpen(false)} aria-label="Close account">×</button>
            <img src="/favicon.png" alt="" />
            {!profile && <><h2>Opening your account...</h2><p>Loading your Deaf Shark profile and loyalty points.</p></>}
            {profile && !profile.authenticated && <><h2>Sign in or create your account</h2><p>Use one secure account to order faster, follow pickups, and earn Deaf Shark loyalty points.</p><a className="primary-button account-continue" href={profile.signInPath}>Continue with ChatGPT</a><small>Your account is created automatically the first time you continue.</small></>}
            {profile?.authenticated && profile.profile && <><span className="account-welcome">Welcome back</span><h2>{profile.profile.displayName}</h2><p>{profile.profile.email}</p><div className="loyalty-card"><span>Deaf Shark Rewards</span><strong>{profile.profile.points} points</strong><div><i style={{ width: `${Math.min(100, profile.profile.points)}%` }} /></div><small>{Math.max(0, 100 - profile.profile.points)} points until your next $5 reward</small></div><p className="loyalty-note">Earn one point for every dollar spent on signed-in orders.</p><a className="account-signout" href={profile.signOutPath}>Sign out</a></>}
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
              <div>
                <strong>DEAF SHARK</strong>
                <small>COFFEE</small>
              </div>
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
              <li><a href="/menu">Coffee Beans</a></li>
              <li><a href="/menu">Cold Brew &amp; Iced</a></li>
              <li><a href="/menu">Hot Classics</a></li>
              <li><a href="/menu">Breakfast &amp; Sandwiches</a></li>
              <li><a href="/menu">Bites &amp; Pastries</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>CLUB &amp; STORY</h4>
            <ul>
              <li><a href="/about">About Deaf Shark</a></li>
              <li><a href="/about#farm">Finca Montevideo</a></li>
              <li><a href="/events">Community Events</a></li>
              <li><a href="/employment">Jobs &amp; Careers</a></li>
              <li><a href="/orders">Order Status</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>SERVICE &amp; VISIT</h4>
            <ul>
              <li><a href="/contact">Location &amp; Hours</a></li>
              <li><a href="/contact">Catering &amp; Inquiries</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get Directions ↗</a></li>
              <li><a href="tel:9084818884">(908) 481-8884</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Deaf Shark Coffee — Roasted in Union, New Jersey</span>
          <div className="footer-legal">
            <a href="/contact">Contact</a>
            <a href="/dashboard">Staff Dashboard</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
