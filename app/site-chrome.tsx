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
  const links = [["/", "Home"], ["/menu", "Menu"], ["/about", "Our Story"], ["/contact", "Visit Us"]];
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
        <a href="/" aria-label="Deaf Shark Coffee home"><BrandMark /></a>
        <nav aria-label="Primary navigation">{links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}</nav>
        <div className="header-action">
          <button className="header-icon-button" onClick={() => { setOpen(false); setSearchOpen((current) => !current); }} aria-label="Search menu"><span className="search-glyph" /></button>
          <button className="header-icon-button" onClick={openProfile} aria-label="Open profile"><span className="profile-glyph" /></button>
          {reference && <button className={`order-status-trigger ${order?.status === "ready" ? "ready" : ""}`} onClick={() => setOpen((current) => !current)}><span>{order?.status === "ready" ? "Ready" : "Order status"}</span><i /></button>}
          {action ?? <a className="header-order-link" href="/menu">Order pickup</a>}
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
          <section className="account-modal" role="dialog" aria-modal="true" aria-label="Customer account" onMouseDown={(event) => event.stopPropagation()}>
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
  return <footer><BrandMark dark /><p>Premium Coffee Beans · Roasted in Union, NJ</p><div className="footer-links"><a href="/">Home</a><a href="/menu">Menu</a><a href="/about">Our Story</a><a href="/contact">Visit Us</a></div><a href="/dashboard">Open demo dashboard</a></footer>;
}
