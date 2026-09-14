"use client";

import { useCallback, useEffect, useState } from "react";
import { menuProducts } from "../menu-data";
import { describePromotion, type Promotion, type PromotionKind } from "../../lib/promotions";

type Draft = {
  id?: number;
  name: string;
  kind: PromotionKind;
  active: boolean;
  startDate: string;
  endDate: string;
  days: number[];
  startTime: string;
  endTime: string;
  multiplier: string;
  bonusPoints: string;
  productId: string;
  visitsRequired: string;
};

const emptyDraft: Draft = {
  name: "", kind: "multiplier", active: true, startDate: "", endDate: "", days: [], startTime: "", endTime: "",
  multiplier: "2", bonusPoints: "10", productId: "", visitsRequired: "5",
};

const KIND_LABELS: Record<PromotionKind, { title: string; help: string }> = {
  multiplier: { title: "Points multiplier", help: "Double or triple points on every order in the window. Example: double points on weekends." },
  flat_bonus: { title: "Bonus points per order", help: "A set number of extra points on each order in the window. Example: 10 extra points from 2 PM to 4 PM on weekdays." },
  product_bonus: { title: "Menu item bonus", help: "Extra points for each unit of one menu item. Example: 15 points per Pumpkin Spice Latte." },
  visit_challenge: { title: "Visit challenge", help: "A one-time bonus once a member completes a number of orders between the start and end dates. Example: 5 orders in October earns 50 points." },
};

const DAY_OPTIONS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]] as const;

function draftFrom(promotion: Promotion): Draft {
  return {
    id: promotion.id,
    name: promotion.name,
    kind: promotion.kind,
    active: promotion.active,
    startDate: promotion.startDate ?? "",
    endDate: promotion.endDate ?? "",
    days: promotion.days,
    startTime: promotion.startTime ?? "",
    endTime: promotion.endTime ?? "",
    multiplier: String(promotion.multiplier ?? 2),
    bonusPoints: String(promotion.bonusPoints ?? 10),
    productId: promotion.productId ?? "",
    visitsRequired: String(promotion.visitsRequired ?? 5),
  };
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const productNames = new Map(menuProducts.map((product) => [product.id, product.name]));

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/promotions", { cache: "no-store" });
    if (!response.ok) return setMessage("Promotions could not be loaded.");
    setPromotions(((await response.json()) as { promotions?: Promotion[] }).promotions ?? []);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { load().catch(() => setMessage("Promotions could not be loaded.")); }, 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving promotion…");
    const response = await fetch("/api/admin/promotions", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) return setMessage(result.error || "Could not save that promotion.");
    setMessage(draft.id ? `${draft.name} updated.` : `${draft.name} created.`);
    setDraft(emptyDraft);
    await load();
  }

  async function setActive(promotion: Promotion, active: boolean) {
    const response = await fetch("/api/admin/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: promotion.id, active }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "Could not update that promotion.");
    setMessage(active ? `${promotion.name} switched on.` : `${promotion.name} switched off.`);
    await load();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h1>Promotions</h1>
        <p>Run bonus points campaigns. Promotions add points when an order is completed and never change what a customer pays. Members see current promotions on their rewards card.</p>
      </div>
      {message && <p className="admin-notice" role="status">{message}</p>}

      <form className="promotion-form" onSubmit={save}>
        <h2>{draft.id ? `Edit ${draft.name}` : "New promotion"}</h2>
        <label>Name customers see<input value={draft.name} maxLength={80} onChange={(event) => update({ name: event.target.value })} placeholder="Example: Double Points Weekend" /></label>

        <fieldset className="promotion-kinds">
          <legend>Type</legend>
          {(Object.keys(KIND_LABELS) as PromotionKind[]).map((kind) => (
            <label key={kind} className={draft.kind === kind ? "is-selected" : ""}>
              <input type="radio" name="promotion-kind" checked={draft.kind === kind} onChange={() => update({ kind })} />
              <strong>{KIND_LABELS[kind].title}</strong>
              <small>{KIND_LABELS[kind].help}</small>
            </label>
          ))}
        </fieldset>

        <div className="promotion-grid">
          {draft.kind === "multiplier" && <label>Multiplier<select value={draft.multiplier} onChange={(event) => update({ multiplier: event.target.value })}>
            <option value="2">Double points (2x)</option><option value="3">Triple points (3x)</option><option value="4">4x points</option><option value="5">5x points</option>
          </select></label>}
          {draft.kind !== "multiplier" && <label>{draft.kind === "product_bonus" ? "Bonus points per item" : "Bonus points"}<input type="number" min={1} max={500} step={1} value={draft.bonusPoints} onChange={(event) => update({ bonusPoints: event.target.value })} /></label>}
          {draft.kind === "product_bonus" && <label>Menu item<select value={draft.productId} onChange={(event) => update({ productId: event.target.value })}>
            <option value="">Choose an item</option>
            {menuProducts.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.category})</option>)}
          </select></label>}
          {draft.kind === "visit_challenge" && <label>Orders needed<input type="number" min={2} max={50} step={1} value={draft.visitsRequired} onChange={(event) => update({ visitsRequired: event.target.value })} /></label>}
          <label>Start date{draft.kind === "visit_challenge" ? "" : " (optional)"}<input type="date" value={draft.startDate} onChange={(event) => update({ startDate: event.target.value })} /></label>
          <label>End date{draft.kind === "visit_challenge" ? "" : " (optional)"}<input type="date" value={draft.endDate} onChange={(event) => update({ endDate: event.target.value })} /></label>
          <label>From time (optional)<input type="time" step={900} value={draft.startTime} onChange={(event) => update({ startTime: event.target.value })} /></label>
          <label>Until time (optional)<input type="time" step={900} value={draft.endTime} onChange={(event) => update({ endTime: event.target.value })} /></label>
        </div>

        <fieldset className="promotion-days">
          <legend>Days (leave all unchecked for every day)</legend>
          {DAY_OPTIONS.map(([value, label]) => (
            <label key={value} className="admin-check">
              <input type="checkbox" checked={draft.days.includes(value)} onChange={(event) => update({ days: event.target.checked ? [...draft.days, value] : draft.days.filter((day) => day !== value) })} />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="promotion-actions">
          <button className="admin-save" type="submit" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Create promotion"}</button>
          {draft.id && <button type="button" className="admin-secondary" onClick={() => setDraft(emptyDraft)}>Cancel editing</button>}
        </div>
      </form>

      <section className="records-block">
        <h2>All promotions</h2>
        {promotions.length === 0 ? <p className="empty-records">No promotions yet. Create one above.</p> : (
          <div className="promotion-list">
            {promotions.map((promotion) => (
              <article key={promotion.id} className={`promotion-row${promotion.active ? "" : " is-off"}`}>
                <div>
                  <strong>{promotion.name}</strong>
                  <small>{describePromotion(promotion, promotion.productId ? productNames.get(promotion.productId) : undefined)}</small>
                  <span>{promotion.active ? "On" : "Off"}</span>
                </div>
                <div className="promotion-row-actions">
                  <button type="button" className="admin-secondary" onClick={() => { setDraft(draftFrom(promotion)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <button type="button" className="admin-save" onClick={() => setActive(promotion, !promotion.active)}>{promotion.active ? "Switch off" : "Switch on"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
