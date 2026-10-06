"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DRINK_CATEGORIES,
  EXTRA_SHOT_PRICE,
  modifierGroupsForProduct,
  menuProducts,
  SYRUP_PRICE,
  type PrepStation,
  type ProductSelection,
} from "../menu-data";
import { AdminPanels } from "./admin-panels";
import { AvailabilityPanel } from "./availability-panel";
import { formatCountdown } from "../pause-notice";
import { StationBoard } from "../kds/station-board";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
  selection?: ProductSelection;
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

function formatAddOnPrice(price: number) {
  if (!price) return "";
  return ` +$${price.toFixed(2)}`;
}

function optionWithPrice(label: string, price = 0) {
  return `${label}${formatAddOnPrice(price)}`;
}

function orderItemDetails(item: OrderItem) {
  const product = menuProducts.find((candidate) => candidate.id === item.id);
  const selection = item.selection;
  if (!product || !selection) return item.options ?? [];

  const details: string[] = [];
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  if (product.flavors?.length && selection.flavor) details.push(selection.flavor);
  if (isDrink && selection.temperature) details.push(selection.temperature);
  if (isDrink && selection.milk && selection.milk !== "None") details.push(selection.milk);
  if (isDrink && selection.milk === "None") details.push("No milk");
  if (isDrink && selection.base) details.push(`${selection.base} base`);
  if (isDrink && selection.size) details.push(selection.size);
  if (isDrink) for (const syrup of selection.syrups ?? []) details.push(optionWithPrice(`Syrup: ${syrup}`, SYRUP_PRICE));
  if (isDrink && selection.extraShot) {
    const label = selection.extraShot === 1 ? "Extra shot" : `${selection.extraShot} extra shots`;
    details.push(optionWithPrice(label, selection.extraShot * EXTRA_SHOT_PRICE));
  }
  const groups = modifierGroupsForProduct(product, selection.temperature);
  for (const group of groups) {
    for (const selected of selection.modifiers?.[group.label] ?? []) {
      const price = group.options.find((option) => option.label === selected)?.price ?? 0;
      details.push(optionWithPrice(`${group.label}: ${selected}`, price));
    }
  }
  if (selection.notes) details.push(selection.notes);
  return details;
}

type DashboardView = "orders" | "coffee" | "kitchen" | "menu" | "history" | "loyalty" | "promotions" | "website" | "menuItems" | "hours" | "events" | "forms";

/* Two sections so the counter screen only shows what running orders needs,
   and editing the public site lives in its own place. */
const DASHBOARD_SECTIONS: Array<{ key: "orders" | "website"; label: string; tabs: Array<{ view: DashboardView; label: string }> }> = [
  { key: "orders", label: "Orders", tabs: [
    { view: "orders", label: "Live orders" },
    { view: "menu", label: "Available today" },
    { view: "history", label: "Order history" },
    { view: "loyalty", label: "Accounts" },
    { view: "promotions", label: "Promotions" },
  ] },
  { key: "website", label: "Website", tabs: [
    { view: "website", label: "Homepage" },
    { view: "menuItems", label: "Menu items" },
    { view: "hours", label: "Hours" },
    { view: "events", label: "Events" },
    { view: "forms", label: "Forms" },
  ] },
];

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [prepTime, setPrepTime] = useState(15);
  const [paused, setPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [activeView, setActiveView] = useState<DashboardView>("orders");
  const activeSection = DASHBOARD_SECTIONS.find((section) => section.tabs.some((tab) => tab.view === activeView))?.key ?? "orders";
  const [mobileColumn, setMobileColumn] = useState<Order["status"]>("new");
  const [connection, setConnection] = useState<"live" | "waiting">("waiting");
  const [soundArmed, setSoundArmed] = useState(false);
  /* Ids of new orders a staff member has already seen. Anything new and
     unacknowledged keeps the alarm sounding. */
  const [acknowledgedIds, setAcknowledgedIds] = useState<number[]>([]);
  const lastNewCount = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);

  /* The washing-machine style chime: the opening of Schubert's Die Forelle, the
     public domain melody Samsung's end-of-cycle tune is taken from. Played as
     soft struck tones rather than beeps so it carries across a room without
     sounding like an alarm clock. */
  const CHIME_NOTES = useMemo(() => [
    { hz: 587.33, at: 0.00, len: 0.30 },
    { hz: 587.33, at: 0.22, len: 0.30 },
    { hz: 659.25, at: 0.44, len: 0.30 },
    { hz: 739.99, at: 0.66, len: 0.34 },
    { hz: 880.00, at: 0.94, len: 0.42 },
    { hz: 739.99, at: 1.30, len: 0.30 },
    { hz: 659.25, at: 1.52, len: 0.30 },
    { hz: 587.33, at: 1.74, len: 0.62 },
  ], []);

  /* One audio context for the page. On iPad and iPhone Safari, the "playback"
     audio session lets the chime play even with the silent switch on, the way
     music does. Browsers do not let a page read the device volume, so the Test
     sound button is how staff confirm it is loud enough. */
  const getAudioContext = useCallback(() => {
    if (audioContext.current) return audioContext.current;
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try { session.type = "playback"; } catch { /* older Safari */ }
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext.current = new AudioContextClass();
    return audioContext.current;
  }, []);

  const playAlert = useCallback(() => {
    const context = getAudioContext();
    if (context.state === "suspended") void context.resume();
    /* Still suspended means no one has touched the page yet and the browser is
       holding audio back. Nothing to play; the banner still shows. */
    if (context.state !== "running") return;
    const start = context.currentTime + 0.02;
    for (const note of CHIME_NOTES) {
      const tone = context.createOscillator();
      const bell = context.createOscillator();
      const gain = context.createGain();
      tone.type = "triangle";
      bell.type = "sine";
      tone.frequency.value = note.hz;
      bell.frequency.value = note.hz * 2;
      const at = start + note.at;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.34, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.len);
      tone.connect(gain);
      bell.connect(gain);
      gain.connect(context.destination);
      tone.start(at); bell.start(at);
      tone.stop(at + note.len + 0.02); bell.stop(at + note.len + 0.02);
    }
  }, [CHIME_NOTES, getAudioContext]);

  /* Browsers block sound until the page is tapped once after it loads. Every
     click, key or tap tries to unlock it, and the listeners stay until it
     actually works (Safari can refuse the first tap), then the effect cleans
     them up. Until then a banner tells staff to tap. */
  useEffect(() => {
    if (soundArmed) return;
    const arm = () => {
      const context = getAudioContext();
      void context.resume().then(() => setSoundArmed(context.state === "running")).catch(() => {});
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((name) => window.addEventListener(name, arm));
    arm();
    return () => events.forEach((name) => window.removeEventListener(name, arm));
  }, [soundArmed, getAudioContext]);

  /* Sound can stop after it was working: a phone call, the tablet sleeping, or
     switching apps suspends it. Watch for that and bring the red bar back. */
  useEffect(() => {
    const check = () => {
      const context = audioContext.current;
      if (context && context.state !== "running") setSoundArmed(false);
    };
    const context = getAudioContext();
    context.addEventListener("statechange", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 4000);
    return () => {
      context.removeEventListener("statechange", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [getAudioContext]);

  /* Ticks the pause countdown once a second and reopens at zero. */
  useEffect(() => {
    if (!pausedUntil) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= pausedUntil) { setPaused(false); setPausedUntil(null); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pausedUntil]);

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
          pausedUntil?: number | null;
        };
        setAvailability(data.availability ?? {});
        if (typeof data.prepTime === "number") setPrepTime(data.prepTime);
        if (typeof data.paused === "boolean") setPaused(data.paused);
        setPausedUntil(data.paused && typeof data.pausedUntil === "number" ? data.pausedUntil : null);
      }
    } catch {
      setConnection("waiting");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadData, 0);
    const timer = window.setInterval(loadData, 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadData]);

  const openOrders = orders.filter((order) => ["new", "preparing", "ready"].includes(order.status));
  const newCount = orders.filter((order) => order.status === "new").length;
  /* The feed holds the latest 80 orders, which covers a full day at this shop. */
  const todayKey = new Date().toDateString();
  const completedToday = orders.filter((order) => order.status === "complete" && new Date(order.createdAt).toDateString() === todayKey).length;
  const newOrderIds = useMemo(
    () => orders.filter((order) => order.status === "new").map((order) => order.id),
    [orders],
  );
  const unacknowledged = newOrderIds.filter((id) => !acknowledgedIds.includes(id));
  const alarmActive = unacknowledged.length > 0;

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

  /* Pausing asks how long, so customers see a countdown; resuming is one tap. */
  async function setPause(next: boolean, minutes: number | null = null) {
    setPauseMenuOpen(false);
    setPaused(next);
    setPausedUntil(next && minutes ? Date.now() + minutes * 60_000 : null);
    setClock(Date.now());
    const response = await fetch("/api/menu-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: next, pauseMinutes: minutes }) });
    if (response.ok) {
      const data = await response.json() as { paused?: boolean; pausedUntil?: number | null };
      if (typeof data.paused === "boolean") setPaused(data.paused);
      setPausedUntil(data.paused && typeof data.pausedUntil === "number" ? data.pausedUntil : null);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" href="/"><img src="/favicon.png" alt="" /><span><strong>Deaf Shark Coffee</strong></span></Link>
        <div className="dashboard-nav">
          <div className="dashboard-sections" role="tablist" aria-label="Dashboard section">
            {DASHBOARD_SECTIONS.map((section) => (
              <button key={section.key} type="button" role="tab" aria-selected={activeSection === section.key} className={activeSection === section.key ? "active" : ""} onClick={() => setActiveView(section.tabs[0].view)}>{section.label}</button>
            ))}
          </div>
          <div className="dashboard-tabs">
            {DASHBOARD_SECTIONS.find((section) => section.key === activeSection)!.tabs.map((tab) => (
              <button key={tab.view} type="button" className={activeView === tab.view ? "active" : ""} onClick={() => setActiveView(tab.view)}>
                {tab.label}{tab.view === "orders" && <span>{openOrders.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>
      {!soundArmed && (
        <button type="button" className="sound-unlock-bar">
          <strong>Tap anywhere to turn on the new-order sound</strong>
          <span>The new-order sound is off. Tap once, then press Test sound and check the tablet volume is up.</span>
        </button>
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
        <div><button type="button" className="test-sound-button" onClick={() => { const context = getAudioContext(); void context.resume().then(() => { setSoundArmed(context.state === "running"); playAlert(); }); }}>Test sound</button><span>Current customer wait time</span><button onClick={() => changePrepTime(prepTime - 5)}>−</button><strong>{prepTime} min</strong><button onClick={() => changePrepTime(prepTime + 5)}>+</button></div>
        <div className="rush-summary"><span><strong>{newCount}</strong> new</span><span><strong>{orders.filter((order) => order.status === "preparing").length}</strong> preparing</span><span><strong>{orders.filter((order) => order.status === "ready").length}</strong> ready</span><span><strong>{completedToday}</strong> completed today</span></div>
        <div className="pause-control">
          {paused ? (
            <>
              <span className="pause-status">Paused{pausedUntil ? <>, back in <b>{formatCountdown(pausedUntil - clock)}</b></> : " until you resume"}</span>
              <button className="pause-button paused" onClick={() => void setPause(false)}>Resume online orders</button>
            </>
          ) : (
            <button className="pause-button" onClick={() => setPauseMenuOpen((open) => !open)} aria-expanded={pauseMenuOpen}>Pause online orders</button>
          )}
          {pauseMenuOpen && !paused && (
            <div className="pause-menu" role="menu" aria-label="Pause online orders for">
              <span>Pause for</span>
              {[15, 30, 45, 60, 90, 120].map((minutes) => (
                <button key={minutes} type="button" role="menuitem" onClick={() => void setPause(true, minutes)}>{minutes < 60 ? `${minutes} min` : minutes === 60 ? "1 hour" : `${minutes / 60} hours`}</button>
              ))}
              <button type="button" role="menuitem" onClick={() => void setPause(true, null)}>Until I resume</button>
            </div>
          )}
        </div>
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
        <AvailabilityPanel availability={availability} onChange={setItemAvailability} />
      ) : activeView === "coffee" || activeView === "kitchen" ? (
        <StationBoard station={activeView} embedded />
      ) : <AdminPanels view={activeView === "menuItems" ? "menu" : activeView} />}
    </main>
  );
}

/* Past this many lines a single ticket starts filling the column, so the rest
   collapse behind a toggle. Every item is still one tap away. */
const ORDER_ITEMS_VISIBLE = 3;

function OrderCard({ order, onAdvance, onCancel }: { order: Order; onAdvance: () => void; onCancel: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const overflowCount = Math.max(0, order.items.length - ORDER_ITEMS_VISIBLE);
  const visibleItems = expanded || overflowCount === 0 ? order.items : order.items.slice(0, ORDER_ITEMS_VISIBLE);
  return (
    <article className="order-card">
      <div className="order-card-top"><div><span className={`source-badge source-${order.source}`}>{order.source === "website" ? "Website" : order.source}</span></div><time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time></div>
      <div className="customer-line"><strong>{order.customerName}</strong><span>{order.fulfillmentType === "scheduled" ? "Scheduled" : "ASAP"} pickup · {order.pickupEta}</span></div>
      <div className="order-items">
        {visibleItems.map((item, index) => {
          const detailKey = `${item.id}-${index}`;
          const details = orderItemDetails(item);
          const itemDetailsId = `order-${order.id}-item-${index}-details`;
          const detailsExpanded = Boolean(expandedDetails[detailKey]);
          return (
            <div key={detailKey}>
              <b>{item.quantity}</b>
              <span>
                <strong>{item.name}</strong>
                {details.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="order-item-details-toggle"
                      aria-expanded={detailsExpanded}
                      aria-controls={itemDetailsId}
                      onClick={() => setExpandedDetails((current) => ({ ...current, [detailKey]: !current[detailKey] }))}
                    >
                      {detailsExpanded ? "Hide details" : "Show details"}
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {detailsExpanded && (
                      <ul className="order-item-details" id={itemDetailsId}>
                        {details.map((detail) => <li key={detail}>{detail}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
        {overflowCount > 0 && (
          <button type="button" className="order-items-more" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Show less" : `${overflowCount} more ${overflowCount === 1 ? "item" : "items"}`}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        )}
      </div>
      <div className="payment-line"><span>{order.paymentMethod === "pickup" ? "Pay at pickup" : "Paid online"}</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div>
      <button className="advance-button" onClick={onAdvance}>{nextLabel[order.status]}</button>
      {order.status === "new" && <button className="cancel-order" onClick={onCancel}>Cancel order</button>}
    </article>
  );
}
