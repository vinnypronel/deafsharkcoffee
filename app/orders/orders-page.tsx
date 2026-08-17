"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomerHeader, SiteFooter } from "../site-chrome";

type SavedOrder = { orderNumber: string; phone: string };
type OrderItem = { name: string; quantity: number; unitPrice: number; options?: string[] };
type CustomerOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  totalCents: number;
  status: string;
  paymentMethod: string;
  pickupEta: string;
  createdAt: string;
};

const STORAGE_KEY = "deaf-shark-customer-orders";
const statusLabels: Record<string, string> = { new: "Received", preparing: "Preparing", ready: "Ready for pickup", complete: "Completed", cancelled: "Cancelled" };
const progress = ["new", "preparing", "ready", "complete"];

function getSavedOrders(): SavedOrder[] {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

async function fetchOrder(reference: SavedOrder) {
  const response = await fetch("/api/customer-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reference), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load order");
  return data.order as CustomerOrder;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const references = getSavedOrders();
    if (!references.length) { setLoading(false); return; }
    const results = await Promise.allSettled(references.map(fetchOrder));
    setOrders(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function findOrder(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const reference = { orderNumber: orderNumber.trim().toUpperCase(), phone: phone.trim() };
      const found = await fetchOrder(reference);
      const saved = [reference, ...getSavedOrders().filter((item) => item.orderNumber !== reference.orderNumber)].slice(0, 12);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setOrders((current) => [found, ...current.filter((item) => item.orderNumber !== found.orderNumber)]);
      setOrderNumber("");
      setPhone("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to find order");
    }
  }

  return (
    <main className="orders-page">
      <CustomerHeader active="/orders" />
      <section className="orders-hero">
        <div><span className="eyebrow">Pickup tracker</span><h1>My orders</h1><p>Orders placed on this device appear automatically. You can also find an order with the phone number used at checkout.</p></div>
        <form className="order-lookup" onSubmit={findOrder}>
          <label><span>Order number</span><input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="DS123456" /></label>
          <label><span>Phone number</span><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(908) 555-0123" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button">Find my order</button>
        </form>
      </section>
      <section className="customer-orders-list" aria-live="polite">
        {loading && <div className="orders-empty"><span className="eyebrow">Loading</span><h2>Checking your orders...</h2></div>}
        {!loading && orders.length === 0 && <div className="orders-empty"><img src="/favicon.png" alt="" /><span className="eyebrow">Nothing here yet</span><h2>Your next coffee can start here.</h2><p>Place an order on this device or use the lookup form above.</p><a className="primary-button" href="/menu">Order pickup</a></div>}
        {orders.map((order) => {
          const currentIndex = order.status === "cancelled" ? -1 : progress.indexOf(order.status);
          return (
            <article className="customer-order-card" key={order.orderNumber}>
              <div className="customer-order-head"><div><span className="eyebrow">{new Date(order.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><h2>{order.orderNumber}</h2></div><span className={`customer-status status-${order.status}`}>{statusLabels[order.status] ?? order.status}</span></div>
              {order.status !== "cancelled" && <div className="status-track">{progress.map((step, index) => <div key={step} className={index <= currentIndex ? "reached" : ""}><i /><span>{statusLabels[step]}</span></div>)}</div>}
              <div className="customer-order-body"><div>{order.items.map((item, index) => <div className="customer-order-item" key={`${item.name}-${index}`}><span>{item.quantity}×</span><div><strong>{item.name}</strong>{item.options?.length ? <small>{item.options.join(" · ")}</small> : null}</div></div>)}</div><div className="customer-order-total"><span>Pickup estimate</span><strong>{order.status === "ready" ? "Ready now" : order.pickupEta}</strong><span>Total</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div></div>
            </article>
          );
        })}
      </section>
      <SiteFooter />
    </main>
  );
}
