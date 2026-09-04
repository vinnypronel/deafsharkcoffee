"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { menuProducts, type PrepStation } from "../menu-data";
import { AdminPanels } from "./admin-panels";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
  prepStation?: PrepStation;
};

type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalCents: number;
  status: "new" | "preparing" | "ready" | "complete" | "cancelled";
  coffeeStatus?: "new" | "preparing" | "ready" | "not_needed";
  kitchenStatus?: "new" | "preparing" | "ready" | "not_needed";
  source: string;
  paymentMethod: string;
  pickupEta: string;
  fulfillmentType?: "asap" | "scheduled";
  scheduledFor?: string | null;
  createdAt: string;
};

const columns: Array<{ key: Order["status"]; title: string; description: string }> = [
  { key: "new", title: "New", description: "Accept these orders" },
  { key: "preparing", title: "Preparing", description: "Working at the counter" },
  { key: "ready", title: "Ready", description: "Waiting for pickup" },
];

const nextStatus: Record<string, Order["status"]> = {
  new: "preparing",
  preparing: "ready",
  ready: "complete",
};

const nextLabel: Record<string, string> = {
  new: "Start preparing",
  preparing: "Mark ready",
  ready: "Complete pickup",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const calendarDate = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${calendarDate} · ${time}`;
}

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [prepTime, setPrepTime] = useState(15);
  const [paused, setPaused] = useState(false);
  const [activeView, setActiveView] = useState<"orders" | "menu" | "website" | "events" | "forms" | "history" | "loyalty">("orders");
  const [mobileColumn, setMobileColumn] = useState<Order["status"]>("new");
  const [connection, setConnection] = useState<"live" | "waiting">("waiting");
  const [soundArmed, setSoundArmed] = useState(false);
  /* Ids of new orders a staff member has already seen. Anything new and
     unacknowledged keeps the alarm sounding. */
  const [acknowledgedIds, setAcknowledgedIds] = useState<number[]>([]);
  const lastNewCount = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);

  /* Browsers block audio until a real gesture, so nothing can sound until a staff
     member taps Enable sound once. The banner below makes an unarmed board obvious. */
  const playAlert = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = audioContext.current ?? new AudioContextClass();
    audioContext.current = context;
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime;
    [0, 0.2, 0.4].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = index === 1 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.28, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.17);
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ordersResponse, menuResponse] = await Promise.all([
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/menu-state", { cache: "no-store" }),
      ]);
      if (ordersResponse.ok) {
        const data = await ordersResponse.json() as { orders?: Order[] };
        const nextOrders = data.orders ?? [];
        const nextNewCount = nextOrders.filter((order) => order.status === "new").length;
        if (nextNewCount > lastNewCount.current && lastNewCount.current !== 0) setMobileColumn("new");
        lastNewCount.current = nextNewCount;
        setOrders(nextOrders);
        setConnection("live");
      }
      if (menuResponse.ok) {
        const data = await menuResponse.json() as {
          availability?: Record<string, boolean>;
          prepTime?: number;
          paused?: boolean;
        };
        setAvailability(data.availability ?? {});
        if (typeof data.prepTime === "number") setPrepTime(data.prepTime);
        if (typeof data.paused === "boolean") setPaused(data.paused);
      }
    } catch {
      setConnection("waiting");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadData, 0);
    const timer = window.setInterval(loadData, 2200);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadData]);

  const openOrders = orders.filter((order) => ["new", "preparing", "ready"].includes(order.status));
  const newCount = orders.filter((order) => order.status === "new").length;
  const newOrderIds = useMemo(
    () => orders.filter((order) => order.status === "new").map((order) => order.id),
    [orders],
  );
  const unacknowledged = newOrderIds.filter((id) => !acknowledgedIds.includes(id));
  const alarmActive = soundArmed && unacknowledged.length > 0;

  /* Repeats until acknowledged. A later order that arrives after an acknowledge
     is not in the acknowledged list, so the alarm starts again on its own. */
  useEffect(() => {
    if (!alarmActive) return;
    playAlert();
    const timer = window.setInterval(playAlert, 3000);
    return () => window.clearInterval(timer);
  }, [alarmActive, playAlert]);

  function acknowledgeOrders() {
    setAcknowledgedIds(newOrderIds);
  }

  async function enableSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = audioContext.current ?? new AudioContextClass();
    audioContext.current = context;
    await context.resume();
    setSoundArmed(true);
  }

  const todayTotal = useMemo(() => orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.totalCents, 0) / 100, [orders]);

  async function updateOrder(id: number, status: Order["status"]) {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadData();
  }

  async function setItemAvailability(productId: string, isAvailable: boolean) {
    setAvailability((current) => ({ ...current, [productId]: isAvailable }));
    await fetch("/api/menu-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, available: isAvailable }),
    });
  }

  async function changePrepTime(newTime: number) {
    const valid = Math.max(5, newTime);
    setPrepTime(valid);
    await fetch("/api/menu-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prepTime: valid }) });
  }

  async function togglePaused() {
    const next = !paused;
    setPaused(next);
    await fetch("/api/menu-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: next }) });
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" href="/"><img src="/favicon.png" alt="" /><span><strong>Deaf Shark Coffee</strong></span></Link>
        <div className="dashboard-tabs">
          <button className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>Live orders <span>{openOrders.length}</span></button>
          <a href="/kds/coffee" target="_blank" rel="noreferrer">Coffee screen</a>
          <a href="/kds/kitchen" target="_blank" rel="noreferrer">Kitchen screen</a>
          <button className={activeView === "menu" ? "active" : ""} onClick={() => setActiveView("menu")}>Menu</button>
          <button className={activeView === "website" ? "active" : ""} onClick={() => setActiveView("website")}>Homepage</button>
          <button className={activeView === "events" ? "active" : ""} onClick={() => setActiveView("events")}>Events</button>
          <button className={activeView === "forms" ? "active" : ""} onClick={() => setActiveView("forms")}>Forms</button>
          <button className={activeView === "loyalty" ? "active" : ""} onClick={() => setActiveView("loyalty")}>Loyalty</button>
          <button className={activeView === "history" ? "active" : ""} onClick={() => setActiveView("history")}>Order history</button>
        </div>
        <div className="dashboard-status-cluster">
          <span className={`sound-status ${soundArmed ? "armed" : "off"}`}><i />{soundArmed ? "Sound on" : "Sound off"}</span>
          <div className={`connection-status ${connection}`}><i />{connection === "live" ? "Live" : "Connecting"}</div>
        </div>
      </header>

      {!soundArmed && (
        <section className="order-alert-bar is-unarmed">
          <div className="order-alert-copy">
            <strong>New order sound is off</strong>
            <span>Tap once to turn it on. Until then this screen makes no noise when an order arrives.</span>
          </div>
          <button type="button" className="order-alert-action" onClick={enableSound}>Enable sound</button>
        </section>
      )}

      {alarmActive && (
        <section className="order-alert-bar is-alarming" role="alert">
          <div className="order-alert-copy">
            <strong>{unacknowledged.length} new {unacknowledged.length === 1 ? "order" : "orders"}</strong>
            <span>The alert keeps sounding until someone acknowledges it.</span>
          </div>
          <button type="button" className="order-alert-action" onClick={acknowledgeOrders}>Acknowledge</button>
        </section>
      )}

      {(activeView === "orders" || activeView === "menu") && <section className="rush-bar">
        <div><span>Current customer wait time</span><button onClick={() => changePrepTime(prepTime - 5)}>−</button><strong>{prepTime} min</strong><button onClick={() => changePrepTime(prepTime + 5)}>+</button></div>
        <div className="rush-summary"><span><strong>{newCount}</strong> new</span><span><strong>{orders.filter((order) => order.status === "preparing").length}</strong> preparing</span><span><strong>${todayTotal.toFixed(2)}</strong> order value</span></div>
        <button className={`pause-button ${paused ? "paused" : ""}`} onClick={togglePaused}>{paused ? "Resume online orders" : "Pause online orders"}</button>
      </section>}

      {activeView === "orders" ? (
        <section className="orders-area">
          <div className="mobile-status-tabs">
            {columns.map((column) => <button key={column.key} className={mobileColumn === column.key ? "active" : ""} onClick={() => setMobileColumn(column.key)}>{column.title}<span>{orders.filter((order) => order.status === column.key).length}</span></button>)}
          </div>
          <div className="order-board">
            {columns.map((column) => {
              const columnOrders = orders.filter((order) => order.status === column.key);
              return (
                <div key={column.key} className={`order-column column-${column.key} ${mobileColumn === column.key ? "mobile-active" : ""}`}>
                  <div className="column-header"><div><h2>{column.title}</h2><p>{column.description}</p></div><span>{columnOrders.length}</span></div>
                  <div className="column-orders">
                    {columnOrders.length === 0 && <div className="empty-orders"><img src="/favicon.png" alt="" /><strong>Nothing here right now</strong><span>New orders will appear automatically.</span></div>}
                    {columnOrders.map((order) => <OrderCard key={order.id} order={order} onAdvance={() => updateOrder(order.id, nextStatus[order.status])} onCancel={() => updateOrder(order.id, "cancelled")} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : activeView === "menu" ? (
        <section className="menu-control-area">
          <div className="menu-control-heading"><div><h1>What is available right now?</h1><p>Changes appear on the customer menu within a few seconds.</p></div><span>{menuProducts.filter((product) => availability[product.id] === false).length} sold out</span></div>
          <div className="availability-grid">
            {menuProducts.map((product) => {
              const available = availability[product.id] !== false;
              return (
                <div key={product.id} className={`availability-card ${available ? "is-available" : "is-sold-out"}`}>
                  <div className="avail-info">
                    <small>{product.category}</small>
                    <strong>{product.name}</strong>
                    <i>${product.price.toFixed(2)}</i>
                  </div>
                  <div className="avail-actions">
                    <button
                      type="button"
                      className={`avail-btn btn-available ${available ? "active" : ""}`}
                      onClick={() => setItemAvailability(product.id, true)}
                      aria-pressed={available}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className={`avail-btn btn-soldout ${!available ? "active" : ""}`}
                      onClick={() => setItemAvailability(product.id, false)}
                      aria-pressed={!available}
                    >
                      Sold Out
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <AdminPanels view="menu" />
        </section>
      ) : <AdminPanels view={activeView} />}
    </main>
  );
}

function OrderCard({ order, onAdvance, onCancel }: { order: Order; onAdvance: () => void; onCancel: () => void }) {
  return (
    <article className="order-card">
      <div className="order-card-top"><div><span className={`source-badge source-${order.source}`}>{order.source === "website" ? "Website" : order.source}</span><strong>#{order.orderNumber.replace("DS", "")}</strong></div><time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time></div>
      <div className="customer-line"><strong>{order.customerName}</strong><span>{order.fulfillmentType === "scheduled" ? "Scheduled" : "ASAP"} pickup · {order.pickupEta}</span></div>
      <div className="order-items">
        {order.items.map((item, index) => <div key={`${item.id}-${index}`}><b>{item.quantity}</b><span><strong>{item.name}</strong>{(item.prepStation || (item.options && item.options.length > 0)) && <small>{[item.prepStation ? `${item.prepStation.toLowerCase()} station` : "", ...(item.options ?? [])].filter(Boolean).join(" · ")}</small>}</span></div>)}
      </div>
      <div className="payment-line"><span>{order.paymentMethod === "pickup" ? "Pay at pickup" : "Paid online"}</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div>
      <button className="advance-button" onClick={onAdvance}>{nextLabel[order.status]}</button>
      {order.status === "new" && <button className="cancel-order" onClick={onCancel}>Cancel order</button>}
    </article>
  );
}
