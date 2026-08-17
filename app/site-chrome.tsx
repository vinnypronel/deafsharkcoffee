"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

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
  const links = [["/menu", "Menu"], ["/about", "About"], ["/contact", "Contact"]];
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

  return (
    <>
      <header className="site-header">
        <a href="/" aria-label="Deaf Shark Coffee home"><BrandMark /></a>
        <nav aria-label="Primary navigation">{links.map(([href, label]) => <a key={href} href={href} className={active === href ? "active" : ""}>{label}</a>)}</nav>
        <div className="header-action">
          {reference && <button className={`order-status-trigger ${order?.status === "ready" ? "ready" : ""}`} onClick={() => setOpen((current) => !current)}><span>{order?.status === "ready" ? "Ready" : "Order status"}</span><i /></button>}
          {action ?? <a className="header-order-link" href="/menu">Order pickup</a>}
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
    </>
  );
}

export function SiteFooter() {
  return <footer><BrandMark dark /><p>Premium Coffee Beans · Roasted in Union, NJ</p><div className="footer-links"><a href="/menu">Menu</a><a href="/about">About</a><a href="/contact">Contact</a></div><a href="/dashboard">Open demo dashboard</a></footer>;
}
