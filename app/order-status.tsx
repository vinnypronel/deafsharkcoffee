"use client";

import { useEffect, useState } from "react";

type CustomerOrder = { orderNumber: string; status: string; totalCents: number; pickupEta: string; paymentMethod: string; items: Array<{ name: string; quantity: number; options?: string[] }> };
const statusLabels: Record<string, string> = { new: "Order received", preparing: "We’re preparing your order", ready: "Ready for pickup", complete: "Pickup complete", cancelled: "Order cancelled" };

export function OrderStatus({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch("/api/customer-orders", { method: "POST", credentials: "include", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber }) });
        const result = await response.json() as { order?: CustomerOrder; error?: string };
        if (!response.ok || !result.order) throw new Error(result.error || "Unable to load your order.");
        setOrder(result.order);
        setError("");
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Connection interrupted. Reconnecting…");
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderNumber]);
  return <div className="account-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-label="Order status" data-lenis-prevent>
      <button className="account-close" onClick={onClose} aria-label="Close order status">×</button>
      <h2>{orderNumber}</h2>
      <p role="status">{order ? statusLabels[order.status] || order.status : "Loading your order…"}</p>
      {error && <p role="alert" className="account-form-message error">{error}</p>}
      {order && <>
        {!["cancelled", "complete"].includes(order.status) && <p>Pickup estimate: {order.pickupEta}</p>}
        <ul>{order.items.map((item, index) => <li key={index}>{item.quantity} × {item.name}{item.options?.length ? <small> · {item.options.join(", ")}</small> : null}</li>)}</ul>
        <p><strong>Total: ${(order.totalCents / 100).toFixed(2)}</strong></p>
        {order.paymentMethod === "pickup" && !["cancelled", "complete"].includes(order.status) && <p>Payment is due at the counter when you pick up.</p>}
        <p>900 Green Lane, Union, NJ · <a href="tel:+19084818884">(908) 481-8884</a></p>
      </>}
    </section>
  </div>;
}
