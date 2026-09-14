"use client";

import { useEffect, useState } from "react";

type CustomerOrder = {
  orderNumber: string;
  status: string;
  totalCents: number;
  pickupEta: string;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; options?: string[] }>;
};

const statusLabels: Record<string, string> = {
  new: "Order received",
  preparing: "We’re preparing your order",
  ready: "Ready for pickup",
  complete: "Pickup complete",
  cancelled: "Order cancelled",
};

/* Three stages. An order marked ready counts as the final stage, since the
   customer has nothing left to wait for but pickup. */
const statusSteps = [
  { key: "new", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "complete", label: "Complete" },
] as const;

/* Matches the account drawer's exit animation, so the tracker slides back out
   to the right instead of vanishing. */
const DRAWER_EXIT_MS = 300;

export function OrderStatus({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setClosing(true);
    window.setTimeout(onClose, reducedMotion ? 0 : DRAWER_EXIT_MS);
  }

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const response = await fetch("/api/customer-orders", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber }),
        });
        const result = await response.json() as { order?: CustomerOrder; error?: string };
        if (!response.ok || !result.order) throw new Error(result.error || "Unable to load your order.");
        setOrder(result.order);
        setError("");
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Connection interrupted. Reconnecting…");
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 5000);
      }
    }

    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderNumber]);

  const cancelled = order?.status === "cancelled";
  const currentStep = order?.status === "ready" ? statusSteps.length - 1 : Math.max(0, statusSteps.findIndex((step) => step.key === order?.status));

  return (
    <div className="account-backdrop" role="presentation" data-closing={closing ? "true" : undefined} onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section className="account-modal order-status-modal" role="dialog" aria-modal="true" aria-label="Order status" data-closing={closing ? "true" : undefined} data-lenis-prevent>
        <button className="account-close" onClick={requestClose} aria-label="Close order status">×</button>
        <div className="order-status-shell">
          <header className="order-status-heading">
            <h2 role="status" aria-live="polite">
              {order ? statusLabels[order.status] || order.status : "Loading your order…"}
            </h2>
          </header>

          {error && <p role="alert" className="account-form-message error">{error}</p>}
          {!order && <div className="order-status-loading" aria-hidden="true"><i /><i /><i /></div>}

          {order && (
            <>
              {cancelled ? (
                <div className="order-status-cancelled">
                  <strong>This order was cancelled</strong>
                  <span>Call us if you have a question about this order.</span>
                </div>
              ) : (
                <ol className="order-progress" aria-label="Order progress">
                  {statusSteps.map((step, index) => {
                    const complete = index < currentStep || order.status === "complete";
                    const current = index === currentStep && order.status !== "complete";
                    return (
                      <li
                        className={complete ? "is-complete" : current ? "is-current" : "is-upcoming"}
                        key={step.key}
                        aria-current={current ? "step" : undefined}
                      >
                        <span className="order-progress-node" aria-hidden="true">{complete ? "✓" : index + 1}</span>
                        <strong>{step.label}</strong>
                      </li>
                    );
                  })}
                </ol>
              )}

              {!cancelled && order.status !== "complete" && (
                <div className="order-pickup-card">
                  <div>
                    <span>Estimated pickup</span>
                    <strong>{order.pickupEta}</strong>
                  </div>
                  <p>We’ll keep this tracker updated automatically.</p>
                </div>
              )}

              <section className="order-status-items" aria-labelledby="order-items-title">
                <header>
                  <div>
                    <span>Your order</span>
                    <h3 id="order-items-title">Items ordered</h3>
                  </div>
                  <strong>{"$"}{(order.totalCents / 100).toFixed(2)}</strong>
                </header>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      <span className="order-item-quantity">{item.quantity}</span>
                      <div>
                        <strong>{item.name}</strong>
                        {item.options?.length ? <small>{item.options.join(" · ")}</small> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="order-status-footer">
                {order.paymentMethod === "pickup" && !cancelled && order.status !== "complete" && (
                  <p>
                    <strong>Pay at pickup</strong>
                    <span>Payment is due at the counter.</span>
                  </p>
                )}
                <p>
                  <strong>Deaf Shark Coffee</strong>
                  <span>900 Green Lane, Union, NJ</span>
                  <a href="tel:+19084818884">(908) 481-8884</a>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
