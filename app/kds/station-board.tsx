"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PrepStation } from "../menu-data";

type Station = "coffee" | "kitchen";
type WorkStatus = "new" | "preparing" | "ready";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  options?: string[];
  prepStation?: PrepStation;
};

type StationOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  status: "new" | "preparing" | "ready" | "complete" | "cancelled";
  coffeeStatus?: WorkStatus | "not_needed";
  kitchenStatus?: WorkStatus | "not_needed";
  paymentMethod: string;
  pickupEta: string;
  fulfillmentType?: "asap" | "scheduled";
  scheduledFor?: string | null;
  createdAt: string;
};

const statusLabels: Record<WorkStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
};

function itemBelongsToStation(item: OrderItem, station: Station) {
  return station === "coffee"
    ? item.prepStation === "COFFEE" || item.prepStation === "RETAIL"
    : item.prepStation === "KITCHEN";
}

function statusFor(order: StationOrder, station: Station): WorkStatus {
  const stored = station === "coffee" ? order.coffeeStatus : order.kitchenStatus;
  if (stored && stored !== "not_needed") return stored;
  return order.status === "ready" ? "ready" : order.status === "preparing" ? "preparing" : "new";
}

function orderAge(createdAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  return `${Math.floor(seconds / 60)} min ago`;
}

function pickupLabel(order: StationOrder) {
  if (order.fulfillmentType === "scheduled" && order.scheduledFor) {
    return `Scheduled ${new Date(order.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return `ASAP · ${order.pickupEta}`;
}

export function StationBoard({ station }: { station: Station }) {
  const [orders, setOrders] = useState<StationOrder[]>([]);
  const [connection, setConnection] = useState<"live" | "waiting">("waiting");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const knownOrderIds = useRef<Set<number> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = audioContext.current ?? new AudioContextClass();
    audioContext.current = context;
    const start = context.currentTime;
    [0, 0.18, 0.36].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = index === 1 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.14);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.15);
    });
  }, [soundEnabled]);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load orders");
      const data = await response.json() as { orders?: StationOrder[] };
      const nextOrders = (data.orders ?? []).filter((order) =>
        order.status !== "complete" &&
        order.status !== "cancelled" &&
        order.items.some((item) => itemBelongsToStation(item, station)),
      );
      const nextIds = new Set(nextOrders.filter((order) => statusFor(order, station) === "new").map((order) => order.id));
      if (knownOrderIds.current && [...nextIds].some((id) => !knownOrderIds.current?.has(id))) playAlert();
      knownOrderIds.current = nextIds;
      setOrders(nextOrders);
      setConnection("live");
    } catch {
      setConnection("waiting");
    }
  }, [playAlert, station]);

  useEffect(() => {
    loadOrders();
    const poller = window.setInterval(loadOrders, 2200);
    const ticker = window.setInterval(() => setClock(new Date()), 30_000);
    return () => {
      window.clearInterval(poller);
      window.clearInterval(ticker);
    };
  }, [loadOrders]);

  const stationOrders = useMemo(() => orders
    .map((order) => ({
      ...order,
      stationStatus: statusFor(order, station),
      stationItems: order.items.filter((item) => itemBelongsToStation(item, station)),
    }))
    .sort((a, b) => {
      const rank = { new: 0, preparing: 1, ready: 2 };
      return rank[a.stationStatus] - rank[b.stationStatus] || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }), [orders, station, clock]);

  async function enableSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = audioContext.current ?? new AudioContextClass();
    audioContext.current = context;
    await context.resume();
    setSoundEnabled(true);
  }

  async function updateStation(orderId: number, stationStatus: WorkStatus) {
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, [station === "coffee" ? "coffeeStatus" : "kitchenStatus"]: stationStatus }
      : order));
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ station, stationStatus }),
    });
    if (!response.ok) await loadOrders();
  }

  const counts = {
    new: stationOrders.filter((order) => order.stationStatus === "new").length,
    preparing: stationOrders.filter((order) => order.stationStatus === "preparing").length,
    ready: stationOrders.filter((order) => order.stationStatus === "ready").length,
  };

  return (
    <main className={`kds-page kds-${station}`}>
      <header className="kds-header">
        <a href="/dashboard" className="kds-brand"><img src="/favicon.png" alt="" /><span><small>Deaf Shark Online Orders</small><strong>{station === "coffee" ? "Coffee station" : "Kitchen station"}</strong></span></a>
        <div className="kds-clock"><strong>{clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{clock.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <div className="kds-header-actions">
          <span className={`kds-connection ${connection}`}><i />{connection === "live" ? "Live" : "Reconnecting"}</span>
          <button type="button" className={soundEnabled ? "sound-on" : ""} onClick={enableSound}>{soundEnabled ? "Sound on" : "Enable sound"}</button>
        </div>
      </header>

      <section className="kds-summary" aria-label="Station order summary">
        <span><b>{counts.new}</b> New</span>
        <span><b>{counts.preparing}</b> Preparing</span>
        <span><b>{counts.ready}</b> Ready</span>
        <p>{station === "coffee" ? "Coffee, prepared drinks, and refrigerated items" : "Breakfast, sandwiches, and bites"}</p>
      </section>

      <section className="kds-grid">
        {stationOrders.length === 0 && (
          <div className="kds-empty"><img src="/favicon.png" alt="" /><h1>No online orders right now.</h1><p>This screen refreshes automatically. New orders will appear here.</p></div>
        )}
        {stationOrders.map((order) => (
          <article key={order.id} className={`kds-ticket status-${order.stationStatus}`}>
            <header>
              <div><span className="kds-order-number">#{order.orderNumber.replace("DS", "")}</span><span className={`kds-status status-${order.stationStatus}`}>{statusLabels[order.stationStatus]}</span></div>
              <time dateTime={order.createdAt}>{orderAge(order.createdAt)}</time>
            </header>
            <div className="kds-customer"><strong>{order.customerName}</strong><span>{pickupLabel(order)}</span></div>
            <div className="kds-items">
              {order.stationItems.map((item, index) => (
                <div key={`${item.id}-${index}`}>
                  <b>{item.quantity}</b>
                  <span><strong>{item.name}</strong>{item.options && item.options.length > 0 && <small>{item.options.join(" · ")}</small>}</span>
                </div>
              ))}
            </div>
            <footer>
              <span>{order.paymentMethod === "pickup" ? "PAY AT PICKUP" : "PAID ONLINE"}</span>
              {order.stationStatus === "new" && <button onClick={() => updateStation(order.id, "preparing")}>Start order</button>}
              {order.stationStatus === "preparing" && <button onClick={() => updateStation(order.id, "ready")}>Mark station ready</button>}
              {order.stationStatus === "ready" && <strong>Station complete ✓</strong>}
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
