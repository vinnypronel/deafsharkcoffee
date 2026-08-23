"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { menuProducts } from "../menu-data";

type View = "website" | "events" | "forms" | "history" | "loyalty";
type Featured = { slot: number; productId: string; categoryLabel: string; title: string; buttonLabel: string; priceCents: number; mediaUrl: string };
type EventDraft = { id?: number; title: string; description: string; dateLabel: string; timeLabel: string; location: string; entryLabel: string; details: string; buttonLabel: string; buttonHref: string; imageLeftUrl: string; imageRightUrl: string; imageCaption: string | null; published: boolean; sortOrder: number; createdAt?: string };
type Records = { orders: any[]; contacts: any[]; applications: any[]; subscribers: any[] };
type LoyaltyMember = { userId: string; email: string; displayName: string; phone?: string | null; points: number; lifetimePoints: number; updatedAt: string };
type LoyaltyTransaction = { id: number; userId: string; orderId?: number | null; pointsChange: number; balanceAfter: number; reason: string; createdAt: string };
type LoyaltyData = { members: LoyaltyMember[]; transactions: LoyaltyTransaction[] };

const emptyEvent: EventDraft = {
  title: "", description: "", dateLabel: "", timeLabel: "", location: "900 Green Lane, Union NJ 07083",
  entryLabel: "Free entry", details: "", buttonLabel: "Learn more", buttonHref: "/contact",
  imageLeftUrl: "/events/puppy-mango.jpg", imageRightUrl: "/events/puppy-party-flyer.jpg", imageCaption: "", published: true, sortOrder: 0,
};

const when = (value: string | number | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
const dollars = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export function AdminPanels({ view }: { view: View }) {
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [records, setRecords] = useState<Records>({ orders: [], contacts: [], applications: [], subscribers: [] });
  const [loyalty, setLoyalty] = useState<LoyaltyData>({ members: [], transactions: [] });
  const [message, setMessage] = useState("");
  const [newEvent, setNewEvent] = useState<EventDraft>(emptyEvent);

  const load = useCallback(async () => {
    const [contentResponse, recordsResponse, loyaltyResponse] = await Promise.all([
      fetch("/api/admin/content", { cache: "no-store" }),
      fetch("/api/admin/records", { cache: "no-store" }),
      fetch("/api/admin/loyalty", { cache: "no-store" }),
    ]);
    if (contentResponse.ok) {
      const data = await contentResponse.json();
      setFeatured(data.featured ?? []);
      setEvents(data.events ?? []);
    }
    if (recordsResponse.ok) setRecords(await recordsResponse.json());
    if (loyaltyResponse.ok) setLoyalty(await loyaltyResponse.json());
  }, []);

  useEffect(() => { load().catch(() => setMessage("Some admin data could not be loaded.")); }, [load]);

  async function save(body: Record<string, unknown>, success: string) {
    setMessage("Saving…");
    const response = await fetch("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not save changes."); return false; }
    setMessage(success);
    await load();
    return true;
  }

  async function upload(file: File, onDone: (url: string) => void) {
    setMessage(`Uploading ${file.name}…`);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Upload failed.");
    onDone(data.url);
    setMessage("Upload ready. Save the item to publish it.");
  }

  if (view === "website") return (
    <AdminSection eyebrow="Homepage editor" title="Featured carousel" description="Edit the video or image, category, item name, button wording, and displayed price. Saving publishes the change to the homepage.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <div className="admin-editor-grid">
        {featured.map((item, index) => (
          <article className="admin-editor-card" key={item.slot}>
            <header><span>Slide {item.slot}</span><strong>{item.title}</strong></header>
            <MediaPreview url={item.mediaUrl} title={item.title} />
            <label>Menu item<select value={item.productId} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, productId: event.target.value } : entry))}>{menuProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
            <div className="admin-field-row"><label>Category<input value={item.categoryLabel} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, categoryLabel: event.target.value } : entry))} /></label><label>Item title<input value={item.title} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} /></label></div>
            <div className="admin-field-row"><label>Button text<input value={item.buttonLabel} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, buttonLabel: event.target.value } : entry))} /></label><label>Price ($)<input type="number" min="0" step="0.01" value={(item.priceCents / 100).toFixed(2)} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, priceCents: Math.round(Number(event.target.value) * 100) } : entry))} /></label></div>
            <label>Video or image URL<input value={item.mediaUrl} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, mediaUrl: event.target.value } : entry))} /></label>
            <label className="admin-upload">Upload replacement<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file, (url) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, mediaUrl: url } : entry))); }} /></label>
            <button className="admin-save" onClick={() => save({ kind: "featured", ...item }, `Slide ${item.slot} published.`)}>Save slide</button>
          </article>
        ))}
      </div>
    </AdminSection>
  );

  if (view === "events") return (
    <AdminSection eyebrow="Events manager" title="Upcoming events" description="Add, edit, hide, or remove events. Published events appear in the same two-image format on the Events page.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <EventEditor event={newEvent} title="Add a new event" setEvent={setNewEvent} upload={upload} onSave={async () => { if (await save({ kind: "event", ...newEvent }, "Event added.")) setNewEvent(emptyEvent); }} />
      <div className="admin-event-list">
        {events.map((event, index) => <EventEditor key={event.id} event={event} title={event.title || "Untitled event"} setEvent={(next) => setEvents((all) => all.map((entry, i) => i === index ? next : entry))} upload={upload} onSave={() => save({ kind: "event", ...event }, `${event.title} updated.`)} onDelete={async () => { if (!window.confirm(`Remove ${event.title}?`)) return; await fetch(`/api/admin/content?id=${event.id}`, { method: "DELETE" }); setMessage("Event removed."); await load(); }} />)}
      </div>
    </AdminSection>
  );

  if (view === "history") return (
    <AdminSection eyebrow="Sales records" title="Complete order history" description="Every website order is retained here with its date, payment method, pickup type, total, and final status.">
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Pickup</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead><tbody>{records.orders.map((order) => <tr key={order.id}><td>{when(order.createdAt)}</td><td>#{order.orderNumber}</td><td><strong>{order.customerName}</strong><small>{order.phone}</small></td><td>{order.fulfillmentType === "scheduled" ? order.pickupEta : "ASAP"}</td><td>{order.paymentMethod}</td><td>{dollars(order.totalCents)}</td><td><span className={`record-status status-${order.status}`}>{order.status}</span></td></tr>)}</tbody></table></div>
    </AdminSection>
  );

  if (view === "loyalty") return (
    <LoyaltyManager data={loyalty} message={message} setMessage={setMessage} reload={load} />
  );

  return (
    <AdminSection eyebrow="Inbox" title="Submitted forms" description="Contact messages, employment applications, and newsletter subscriptions are stored with submission dates.">
      <div className="record-summary"><span><strong>{records.contacts.length}</strong> contact messages</span><span><strong>{records.applications.length}</strong> applications</span><span><strong>{records.subscribers.length}</strong> subscribers</span></div>
      <RecordsBlock title="Contact messages" rows={records.contacts.map((row) => ({ id: row.id, date: row.createdAt, heading: row.name, meta: `${row.email}${row.phone ? ` · ${row.phone}` : ""} · ${row.topic}`, body: row.message }))} />
      <RecordsBlock title="Employment applications" rows={records.applications.map((row) => ({ id: row.id, date: row.createdAt, heading: row.fullName, meta: `${row.email} · ${row.phone} · ${row.position} · ${row.employmentType}`, body: [row.experience, row.why].filter(Boolean).join("\n\n") || "No additional notes." }))} />
      <RecordsBlock title="Newsletter subscriptions" rows={records.subscribers.map((row) => ({ id: row.id, date: row.consentedAt, heading: row.email, meta: row.status, body: row.consentText }))} />
    </AdminSection>
  );
}

function LoyaltyManager({ data, message, setMessage, reload }: { data: LoyaltyData; message: string; setMessage: (message: string) => void; reload: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const members = data.members.filter((member) => !query || [member.displayName, member.email, member.phone].some((value) => value?.toLowerCase().includes(query)));
  const memberNames = new Map(data.members.map((member) => [member.userId, member.displayName]));

  async function adjust(member: LoyaltyMember) {
    const pointsChange = Number(changes[member.userId]);
    const reason = reasons[member.userId]?.trim();
    if (!Number.isInteger(pointsChange) || pointsChange === 0) return setMessage("Enter a whole number of points to add or remove.");
    if (!reason) return setMessage("Add a reason so every points change has a record.");
    setSaving(member.userId);
    setMessage("Saving points adjustment…");
    const response = await fetch("/api/admin/loyalty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.userId, pointsChange, reason }),
    });
    const result = await response.json();
    setSaving(null);
    if (!response.ok) return setMessage(result.error || "Could not update points.");
    setChanges((current) => ({ ...current, [member.userId]: "" }));
    setReasons((current) => ({ ...current, [member.userId]: "" }));
    setMessage(`${member.displayName} now has ${result.balanceAfter} points.`);
    await reload();
  }

  return (
    <AdminSection eyebrow="Customer rewards" title="Loyalty members" description="Review member balances and make traceable corrections. Customers earn one point per dollar when a signed-in order is completed; every 100 points unlocks a $5 reward.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <div className="record-summary"><span><strong>{data.members.length}</strong> members</span><span><strong>{data.members.reduce((total, member) => total + member.points, 0)}</strong> active points</span><span><strong>{data.transactions.length}</strong> recent point records</span></div>
      <label className="loyalty-search">Find a member<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone" /></label>
      <div className="loyalty-member-grid">
        {members.map((member) => (
          <article className="loyalty-member-card" key={member.userId}>
            <header><div><strong>{member.displayName}</strong><small>{member.email}{member.phone ? ` · ${member.phone}` : ""}</small></div><span>{member.points} pts</span></header>
            <div className="loyalty-progress"><i style={{ width: `${Math.min(100, member.points % 100 || (member.points > 0 ? 100 : 0))}%` }} /></div>
            <p>{member.points >= 100 ? `${Math.floor(member.points / 100)} reward${Math.floor(member.points / 100) === 1 ? "" : "s"} available` : `${100 - member.points} points to a $5 reward`} · {member.lifetimePoints} earned from orders</p>
            <div className="loyalty-adjustment">
              <label>Points<input type="number" step="1" value={changes[member.userId] ?? ""} onChange={(event) => setChanges((current) => ({ ...current, [member.userId]: event.target.value }))} placeholder="+25 or -25" /></label>
              <label>Reason<input value={reasons[member.userId] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [member.userId]: event.target.value }))} maxLength={120} placeholder="Customer service correction" /></label>
              <button className="admin-save" disabled={saving === member.userId} onClick={() => adjust(member)}>{saving === member.userId ? "Saving…" : "Apply"}</button>
            </div>
          </article>
        ))}
        {members.length === 0 && <p className="empty-records">No matching loyalty members.</p>}
      </div>
      <section className="records-block"><h2>Recent points activity</h2><div className="admin-table-wrap"><table className="admin-table loyalty-ledger"><thead><tr><th>Date</th><th>Customer</th><th>Change</th><th>Balance</th><th>Reason</th></tr></thead><tbody>{data.transactions.map((entry) => <tr key={entry.id}><td>{when(entry.createdAt)}</td><td>{memberNames.get(entry.userId) || "Customer"}</td><td><strong className={entry.pointsChange >= 0 ? "points-positive" : "points-negative"}>{entry.pointsChange >= 0 ? "+" : ""}{entry.pointsChange}</strong></td><td>{entry.balanceAfter}</td><td>{entry.reason === "completed_order" ? `Completed order${entry.orderId ? ` #${entry.orderId}` : ""}` : entry.reason.replace(/^staff_adjustment:/, "Staff: ")}</td></tr>)}</tbody></table></div></section>
    </AdminSection>
  );
}

function AdminSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</section>;
}
function AdminNotice({ children }: { children: ReactNode }) { return <p className="admin-notice" role="status">{children}</p>; }
function MediaPreview({ url, title }: { url: string; title: string }) { return <div className="admin-media-preview">{/\.(mp4|webm)(\?|$)/i.test(url) ? <video src={url} muted loop autoPlay playsInline /> : <img src={url} alt={title} />}</div>; }

function EventEditor({ event, title, setEvent, upload, onSave, onDelete }: { event: EventDraft; title: string; setEvent: (event: EventDraft) => void; upload: (file: File, done: (url: string) => void) => void; onSave: () => void; onDelete?: () => void }) {
  const field = (key: keyof EventDraft, value: string | boolean | number) => setEvent({ ...event, [key]: value });
  return <details className="admin-event-editor" open={!event.id}><summary><strong>{title}</strong><span>{event.published ? "Published" : "Hidden"}</span></summary><div className="admin-event-fields">
    <div className="admin-field-row"><label>Event title<input value={event.title} onChange={(e) => field("title", e.target.value)} /></label><label>Date<input value={event.dateLabel} onChange={(e) => field("dateLabel", e.target.value)} placeholder="Friday, September 4, 2026" /></label></div>
    <label>Description<textarea value={event.description} onChange={(e) => field("description", e.target.value)} /></label>
    <div className="admin-field-row"><label>Time<input value={event.timeLabel} onChange={(e) => field("timeLabel", e.target.value)} /></label><label>Location<input value={event.location} onChange={(e) => field("location", e.target.value)} /></label></div>
    <div className="admin-field-row"><label>Entry<input value={event.entryLabel} onChange={(e) => field("entryLabel", e.target.value)} /></label><label>Details<input value={event.details} onChange={(e) => field("details", e.target.value)} /></label></div>
    <div className="admin-field-row"><label>Button text<input value={event.buttonLabel} onChange={(e) => field("buttonLabel", e.target.value)} /></label><label>Button link<input value={event.buttonHref} onChange={(e) => field("buttonHref", e.target.value)} /></label></div>
    <div className="admin-field-row"><label>Left image URL<input value={event.imageLeftUrl} onChange={(e) => field("imageLeftUrl", e.target.value)} /></label><label>Right image URL<input value={event.imageRightUrl} onChange={(e) => field("imageRightUrl", e.target.value)} /></label></div>
    <div className="admin-field-row"><label className="admin-upload">Upload left image<input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, (url) => field("imageLeftUrl", url)); }} /></label><label className="admin-upload">Upload right image<input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, (url) => field("imageRightUrl", url)); }} /></label></div>
    <div className="admin-field-row"><label>Image caption<input value={event.imageCaption || ""} onChange={(e) => field("imageCaption", e.target.value)} /></label><label>Display order<input type="number" min="0" value={event.sortOrder} onChange={(e) => field("sortOrder", Number(e.target.value))} /></label></div>
    <label className="admin-check"><input type="checkbox" checked={event.published} onChange={(e) => field("published", e.target.checked)} /> Show this event publicly</label>
    <div className="admin-editor-actions"><button className="admin-save" onClick={onSave}>{event.id ? "Save event" : "Add event"}</button>{onDelete && <button className="admin-delete" onClick={onDelete}>Delete event</button>}</div>
  </div></details>;
}

function RecordsBlock({ title, rows }: { title: string; rows: Array<{ id: number; date: string; heading: string; meta: string; body: string }> }) {
  return <section className="records-block"><h2>{title}</h2>{rows.length === 0 ? <p className="empty-records">Nothing submitted yet.</p> : <div className="records-list">{rows.map((row) => <article key={row.id}><header><div><strong>{row.heading}</strong><small>{row.meta}</small></div><time>{when(row.date)}</time></header><p>{row.body}</p></article>)}</div>}</section>;
}
