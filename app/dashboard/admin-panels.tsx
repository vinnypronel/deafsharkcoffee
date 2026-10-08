"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { categories as menuCategories, menuProducts } from "../menu-data";
import { PromotionsManager } from "./promotions-manager";
import { bestAvailableTier, nextTierProgress } from "../../lib/loyalty";
import { DISPLAY_WEEK, WEEKDAY_NAMES, parseWeeklyHours, type DayHours, type Weekday, type WeeklyHours } from "../../lib/store-hours";

type View = "menu" | "website" | "hours" | "events" | "forms" | "history" | "loyalty" | "promotions";
type Featured = { slot: number; productId: string; categoryLabel: string; title: string; buttonLabel: string; priceCents: number; mediaUrl: string };
type MenuDraft = { productId: string; name: string; category: string; description: string; priceCents: number; photoUrl: string; removed?: boolean };
type EventDraft = { id?: number; title: string; description: string; dateLabel: string; timeLabel: string; location: string; entryLabel: string; details: string; buttonLabel: string; buttonHref: string; imageLeftUrl: string; imageRightUrl: string; imageCaption: string | null; published: boolean; sortOrder: number; createdAt?: string };
type OrderRecord = { id: number; orderNumber: string; customerName: string; phone: string; itemsJson: string; fulfillmentType: string; pickupEta: string; paymentMethod: string; totalCents: number; status: string; createdAt: string | Date };
type OrderHistoryItem = { name: string; quantity: number; unitPrice?: number; options: string[] };
type ContactRecord = { id: number; name: string; email: string; phone?: string | null; topic: string; message: string; createdAt: string | Date };
type ApplicationRecord = { id: number; fullName: string; email: string; phone: string; position: string; employmentType: string; experience?: string | null; why?: string | null; createdAt: string | Date };
type SubscriberRecord = { id: number; email: string; status: string; consentText: string; consentedAt: string | Date };
type OrderSummary = { totalOrders: number; completedOrders: number; cancelledOrders: number; subtotalCents: number };
type Records = { orders: OrderRecord[]; orderSummary: OrderSummary; contacts: ContactRecord[]; applications: ApplicationRecord[]; subscribers: SubscriberRecord[] };
type LoyaltyMember = { userId: string; email: string; displayName: string; phone?: string | null; points: number; lifetimePoints: number; updatedAt: string; birthday?: { onFile: boolean; month: number | null; day: number | null; isToday: boolean; eligibleToday: boolean; redeemedThisYear: boolean; maxCents: number }; referredByName?: string | null; welcomeOffer?: MemberOffer | null; studentEmail?: string | null; studentVerifiedAt?: string | null };
const BIRTHDAY_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type LoyaltyTransaction = { id: number; userId: string; orderId?: number | null; pointsChange: number; balanceAfter: number; reason: string; createdAt: string };
type MemberOffer = { id: number; userId: string; offerType: string; code: string; status: string; issuedAt: string; redeemedAt?: string | null; redeemedBy?: string | null };
type AdminAccount = { email: string; name: string | null; hasAccount: boolean; verified: boolean; createdAt: string | null };
type LoyaltyData = { members: LoyaltyMember[]; transactions: LoyaltyTransaction[]; offers: MemberOffer[]; admins: AdminAccount[] };

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
  const [menu, setMenu] = useState<MenuDraft[]>([]);
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [records, setRecords] = useState<Records>({ orders: [], orderSummary: { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, subtotalCents: 0 }, contacts: [], applications: [], subscribers: [] });
  const [loyalty, setLoyalty] = useState<LoyaltyData>({ members: [], transactions: [], offers: [], admins: [] });
  const [message, setMessage] = useState("");
  const [newEvent, setNewEvent] = useState<EventDraft>(emptyEvent);

  const load = useCallback(async () => {
    const [contentResponse, recordsResponse, loyaltyResponse] = await Promise.all([
      fetch("/api/admin/content", { cache: "no-store" }),
      fetch("/api/admin/records", { cache: "no-store" }),
      fetch("/api/admin/loyalty", { cache: "no-store" }),
    ]);
    if (contentResponse.ok) {
      const data = await contentResponse.json() as {
        featured?: Featured[];
        events?: EventDraft[];
        menu?: MenuDraft[];
        removedMenu?: string[];
      };
      setFeatured(data.featured ?? []);
      setEvents(data.events ?? []);
      const overrides = new Map<string, MenuDraft>((data.menu ?? []).map((item) => [item.productId, item]));
      const removedMenu = new Set(data.removedMenu ?? []);
      setMenu(menuProducts.map((product) => {
        const override = overrides.get(product.id);
        return {
          productId: product.id,
          name: override?.name || product.name,
          category: override?.category || product.category,
          description: override?.description || product.description,
          priceCents: override?.priceCents ?? Math.round(product.price * 100),
          photoUrl: override?.photoUrl ?? product.photo ?? "",
          removed: removedMenu.has(product.id),
        };
      }));
    }
    if (recordsResponse.ok) setRecords(await recordsResponse.json() as Records);
    if (loyaltyResponse.ok) {
      const data = await loyaltyResponse.json() as Partial<LoyaltyData>;
      setLoyalty({ members: data.members ?? [], transactions: data.transactions ?? [], offers: data.offers ?? [], admins: data.admins ?? [] });
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      load().catch(() => setMessage("Some admin data could not be loaded."));
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function save(body: Record<string, unknown>, success: string) {
    setMessage("Saving…");
    const response = await fetch("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
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
    const data = await response.json() as { error?: string; url: string };
    if (!response.ok) return setMessage(data.error || "Upload failed.");
    onDone(data.url);
    setMessage("Upload ready. Save the item to publish it.");
  }

  if (view === "menu") return (
    <MenuContentManager menu={menu} setMenu={setMenu} message={message} save={save} upload={upload} />
  );

  if (view === "website") return (
    <AdminSection title="Homepage Editor" description="Edit the video or image, category, item name, button wording, and displayed price. Saving publishes the change to the homepage.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <div className="admin-editor-grid">
        {featured.map((item, index) => (
          <article className="admin-editor-card" key={item.slot}>
            <header><span>Slide {item.slot}</span><strong>{item.title}</strong></header>
            <MediaPreview url={item.mediaUrl} title={item.title} />
            <label>Menu item<select value={item.productId} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, productId: event.target.value } : entry))}>{menuProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
            <div className="admin-field-row"><label>Category<input value={item.categoryLabel} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, categoryLabel: event.target.value } : entry))} /></label><label>Item title<input value={item.title} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} /></label></div>
            <div className="admin-field-row"><label>Button text<input value={item.buttonLabel} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, buttonLabel: event.target.value } : entry))} /></label><label>Price ($)<input type="number" min="0" step="0.01" value={(item.priceCents / 100).toFixed(2)} onChange={(event) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, priceCents: Math.round(Number(event.target.value) * 100) } : entry))} /></label></div>
            <label className="admin-upload">Replace video or photo<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file, (url) => setFeatured((all) => all.map((entry, i) => i === index ? { ...entry, mediaUrl: url } : entry))); }} /></label>
            <button className="admin-save" onClick={() => save({ kind: "featured", ...item }, `Slide ${item.slot} published.`)}>Save slide</button>
          </article>
        ))}
      </div>
    </AdminSection>
  );

  if (view === "hours") return <HoursManager />;

  if (view === "events") return (
    <AdminSection title="Event Manager" description="Add, edit, hide, or remove events. Published events appear in the same two-image format on the Events page.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <EventEditor event={newEvent} title="Add a new event" setEvent={setNewEvent} upload={upload} onSave={async () => { if (await save({ kind: "event", ...newEvent }, "Event added.")) setNewEvent(emptyEvent); }} />
      <div className="admin-event-list">
        {events.map((event, index) => <EventEditor key={event.id} event={event} title={event.title || "Untitled event"} setEvent={(next) => setEvents((all) => all.map((entry, i) => i === index ? next : entry))} upload={upload} onSave={() => save({ kind: "event", ...event }, `${event.title} updated.`)} onDelete={async () => { if (!window.confirm(`Remove ${event.title}?`)) return; await fetch(`/api/admin/content?id=${event.id}`, { method: "DELETE" }); setMessage("Event removed."); await load(); }} />)}
      </div>
    </AdminSection>
  );

  if (view === "history") return (
    <AdminSection title="Complete order history" description="Every website order is retained here with its date, payment method, pickup type, total, and final status.">
      <div className="record-summary order-history-totals" aria-label="All-time order totals">
        <span><strong>{records.orderSummary.totalOrders.toLocaleString()}</strong> total orders</span>
        <span><strong>{records.orderSummary.completedOrders.toLocaleString()}</strong> completed orders</span>
        <span><strong>{records.orderSummary.cancelledOrders.toLocaleString()}</strong> cancelled orders</span>
        <span><strong>{dollars(records.orderSummary.subtotalCents)}</strong> online order subtotal</span>
      </div>
      <OrderHistoryTable orders={records.orders} />
    </AdminSection>
  );

  if (view === "promotions") return <PromotionsManager />;

  if (view === "loyalty") return (
    <LoyaltyManager data={loyalty} message={message} setMessage={setMessage} reload={load} />
  );

  return (
    <FormsInbox records={records} />
  );
}

type FormsFilter = "all" | "contact" | "employment";

/* Contact and job forms side by side, with tabs to narrow to one kind. The
   newsletter list only shows under All, since it is sign-ups, not messages. */
function FormsInbox({ records }: { records: Records }) {
  const [filter, setFilter] = useState<FormsFilter>("all");
  const tabs: Array<{ key: FormsFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: records.contacts.length + records.applications.length },
    { key: "contact", label: "Contact", count: records.contacts.length },
    { key: "employment", label: "Employment", count: records.applications.length },
  ];
  return (
    <AdminSection title="Contact / Employment forms" description="Every contact message and job application sent from the website, newest first.">
      <div className="forms-tabs" role="tablist" aria-label="Which forms to show">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={filter === tab.key} className={filter === tab.key ? "active" : ""} onClick={() => setFilter(tab.key)}>
            {tab.label} <span>{tab.count}</span>
          </button>
        ))}
      </div>
      {filter !== "employment" && <RecordsBlock title="Contact messages" rows={records.contacts.map((row) => ({ id: row.id, date: row.createdAt, heading: row.name, meta: `${row.email}${row.phone ? ` · ${row.phone}` : ""} · ${row.topic}`, body: row.message }))} />}
      {filter !== "contact" && <RecordsBlock title="Employment applications" rows={records.applications.map((row) => ({ id: row.id, date: row.createdAt, heading: row.fullName, meta: `${row.email} · ${row.phone} · ${row.position} · ${row.employmentType}`, body: [row.experience, row.why].filter(Boolean).join("\n\n") || "No additional notes." }))} />}
      {filter === "all" && <RecordsBlock title="Newsletter sign-ups" rows={records.subscribers.map((row) => ({ id: row.id, date: row.consentedAt, heading: row.email, meta: row.status, body: row.consentText }))} />}
    </AdminSection>
  );
}

function orderItemsFor(order: OrderRecord): OrderHistoryItem[] {
  try {
    const parsed: unknown = JSON.parse(order.itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (typeof item.name !== "string" || !item.name.trim()) return [];
      const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      const unitPrice = typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) ? item.unitPrice : undefined;
      const options = Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string" && !!option.trim()) : [];
      return [{ name: item.name, quantity, unitPrice, options }];
    });
  } catch {
    return [];
  }
}

function OrderHistoryTable({ orders }: { orders: OrderRecord[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const toggle = (orderId: number) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    return next;
  });

  return <div className="admin-table-wrap"><table className="admin-table order-history-table">
    <thead><tr><th aria-label="Order details" /><th>Date</th><th>Order</th><th>Customer</th><th>Pickup</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>
      {orders.map((order) => {
        const isExpanded = expanded.has(order.id);
        const detailsId = `order-history-details-${order.id}`;
        const items = orderItemsFor(order);
        return <Fragment key={order.id}>
          <tr className={`order-history-summary${isExpanded ? " is-expanded" : ""}`}>
            <td className="order-history-toggle-cell"><button type="button" className="order-history-toggle" aria-expanded={isExpanded} aria-controls={detailsId} aria-label={`${isExpanded ? "Hide" : "Show"} items for order ${order.orderNumber}`} onClick={() => toggle(order.id)}><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg></button></td>
            <td>{when(order.createdAt)}</td><td>#{order.orderNumber}</td><td><strong>{order.customerName}</strong><small>{order.phone}</small></td><td>{order.fulfillmentType === "scheduled" ? order.pickupEta : "ASAP"}</td><td>{order.paymentMethod}</td><td>{dollars(order.totalCents)}</td><td><span className={`record-status status-${order.status}`}>{order.status}</span></td>
          </tr>
          <tr className={`order-history-details-row${isExpanded ? " is-open" : ""}`} aria-hidden={!isExpanded}><td colSpan={8}><div className="order-history-drop"><div className="order-history-drop-inner"><div className="order-history-details" id={detailsId}>
            <strong className="order-history-details-title">Items ordered</strong>
            {items.length ? <ul>{items.map((item, index) => <li key={`${item.name}-${index}`}><div><strong>{item.quantity} × {item.name}</strong>{item.options.length ? <small>{item.options.join(" · ")}</small> : null}</div>{item.unitPrice !== undefined && <span>{dollars(Math.round(item.unitPrice * item.quantity * 100))}</span>}</li>)}</ul> : <p>No item details were saved for this order.</p>}
          </div></div></div></td></tr>
        </Fragment>;
      })}
      {orders.length === 0 && <tr><td colSpan={8} className="order-history-empty">No orders yet.</td></tr>}
    </tbody>
  </table></div>;
}

function MenuContentManager({ menu, setMenu, message, save, upload }: {
  menu: MenuDraft[];
  setMenu: Dispatch<SetStateAction<MenuDraft[]>>;
  message: string;
  save: (body: Record<string, unknown>, success: string) => Promise<boolean>;
  upload: (file: File, onDone: (url: string) => void) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visible = menu.filter((item) => !item.removed && (!query || `${item.name} ${item.category}`.toLowerCase().includes(query)));
  const deleted = menu.filter((item) => item.removed);
  const setRemoved = (item: MenuDraft, removed: boolean) => {
    if (removed && !window.confirm(`Delete ${item.name} from the menu? Customers will no longer see or order it. You can restore it below.`)) return;
    void save({ kind: "menu-removed", productId: item.productId, removed }, removed ? `${item.name} deleted from the menu.` : `${item.name} restored to the menu.`);
  };
  const update = (productId: string, changes: Partial<MenuDraft>) => setMenu((items) => items.map((item) => item.productId === productId ? { ...item, ...changes } : item));

  return (
    <AdminSection title="Menu Editor" description="These edits publish to the customer menu and are also used for secure server-side order pricing.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <label className="loyalty-search">Find a menu item<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item or category" /></label>
      <div className="admin-menu-editor-grid">
        {visible.map((item) => <article className="admin-editor-card admin-menu-editor" key={item.productId}>
          <header><span>{item.category}</span><strong>{item.name}</strong></header>
          {item.photoUrl ? <img className="admin-menu-photo" src={item.photoUrl} alt="" /> : <div className="admin-menu-photo missing"><span>Photo needed</span></div>}
          <label>Item name<input value={item.name} onChange={(event) => update(item.productId, { name: event.target.value })} /></label>
          <label>Category<select value={item.category} onChange={(event) => update(item.productId, { category: event.target.value })}>{menuCategories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
          <label>Description<textarea rows={3} value={item.description} onChange={(event) => update(item.productId, { description: event.target.value })} /></label>
          <label>Base price ($)<input type="number" min="0" step="0.01" value={(item.priceCents / 100).toFixed(2)} onChange={(event) => update(item.productId, { priceCents: Math.round(Number(event.target.value) * 100) })} /></label>
          <label className="admin-upload">Replace photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file, (url) => update(item.productId, { photoUrl: url })); }} /></label>
          <div className="admin-editor-actions">
            <button className="admin-save" onClick={() => save({ kind: "menu", ...item }, `${item.name} published.`)}>Save item</button>
            <button className="admin-delete" onClick={() => setRemoved(item, true)}>Delete item</button>
          </div>
        </article>)}
      </div>
      {deleted.length > 0 && <div className="admin-menu-deleted">
        <h3>Deleted items</h3>
        <p>Hidden from customers and blocked at checkout. Restore an item to put it back on the menu.</p>
        <ul>
          {deleted.map((item) => <li key={item.productId}><span><strong>{item.name}</strong> {item.category}</span><button className="admin-save" onClick={() => setRemoved(item, false)}>Restore</button></li>)}
        </ul>
      </div>}
    </AdminSection>
  );
}

function LoyaltyManager({ data, message, setMessage, reload }: { data: LoyaltyData; message: string; setMessage: (message: string) => void; reload: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [section, setSection] = useState<"customers" | "admins">("customers");
  const query = search.trim().toLowerCase();
  const memberNames = new Map(data.members.map((member) => [member.userId, member.displayName]));
  /* Coupons apply automatically at online checkout, so staff only look
     customers up by who they are. */
  const members = data.members.filter((member) => {
    if (!query) return true;
    return [member.displayName, member.email, member.phone].some((value) => value?.toLowerCase().includes(query));
  });

  async function redeemBirthday(member: LoyaltyMember) {
    if (!window.confirm(`Give ${member.displayName} their free birthday drink (up to $8)? This can only be done once this year.`)) return;
    setSaving(`birthday:${member.userId}`);
    setMessage("Redeeming birthday drink…");
    const response = await fetch("/api/admin/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.userId, action: "redeem_birthday" }),
    });
    const result = await response.json() as { error?: string };
    setSaving(null);
    if (!response.ok) return setMessage(result.error || "Could not redeem the birthday drink.");
    setMessage(`${member.displayName}'s birthday drink was redeemed.`);
    await reload();
  }


  return (
    <AdminSection title="Accounts" description="Customers and the verified admin accounts that can open this dashboard. Customer names and mobile numbers are read-only for staff. Welcome coupons apply automatically at online checkout.">
      {message && <AdminNotice>{message}</AdminNotice>}
      <div className="accounts-switch" role="tablist" aria-label="Account type">
        <button type="button" role="tab" aria-selected={section === "customers"} className={section === "customers" ? "active" : ""} onClick={() => setSection("customers")}>Customers <span>{data.members.length}</span></button>
        <button type="button" role="tab" aria-selected={section === "admins"} className={section === "admins" ? "active" : ""} onClick={() => setSection("admins")}>Verified admins <span>{data.admins.filter((admin) => admin.verified).length}</span></button>
      </div>
      {section === "admins" && <section className="records-block admin-accounts">
        <p className="admin-accounts-note">Admins sign in on the staff login screen and go straight to this dashboard. They do not earn points or get coupons. To add or remove an admin, ask your web developer to update the admin list.</p>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Account created</th></tr></thead><tbody>
          {data.admins.map((admin) => <tr key={admin.email}><td>{admin.name || "Not signed up yet"}</td><td>{admin.email}</td><td>{admin.verified ? "Verified" : admin.hasAccount ? "Email not verified" : "No account yet"}</td><td>{admin.createdAt ? when(admin.createdAt) : "Not yet"}</td></tr>)}
        </tbody></table></div>
      </section>}
      {section === "customers" && <>
      <div className="record-summary"><span><strong>{data.members.length}</strong> members</span><span><strong>{data.members.reduce((total, member) => total + member.points, 0)}</strong> active points</span></div>
      <label className="loyalty-search">Find a member<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone" /></label>
      <div className="loyalty-member-grid">
        {members.map((member) => {
          return <article className="loyalty-member-card" key={member.userId}>
            <header><div><strong>{member.displayName}{member.studentVerifiedAt && <img className="kean-student-mark" src="/kean-seal.png" alt="Verified Kean student" title={`Verified Kean student${member.studentEmail ? ` (${member.studentEmail})` : ""}`} width="24" height="24" />}</strong><small>{member.email}{member.phone ? ` · ${member.phone}` : ""}</small></div><span>{member.points} pts</span></header>
            <div className="loyalty-progress"><i style={{ width: `${nextTierProgress(member.points).percent}%` }} /></div>
            <p>{bestAvailableTier(member.points) ? `${bestAvailableTier(member.points)?.label} available` : `${nextTierProgress(member.points).pointsAway} points to a ${nextTierProgress(member.points).tier.label}`} · {member.lifetimePoints} lifetime points{member.birthday?.onFile && member.birthday.month && member.birthday.day ? ` · Birthday ${BIRTHDAY_MONTHS[member.birthday.month - 1]} ${member.birthday.day}` : ""}{member.referredByName ? ` · Referred by ${member.referredByName}` : ""}</p>
            {member.welcomeOffer && <div className={`welcome-offer-status ${member.welcomeOffer.status === "active" ? "is-active" : "is-used"}`}>
              <strong>{member.welcomeOffer.status === "redeemed" ? "✓ Signup coupon used" : member.welcomeOffer.status === "active" ? "Signup coupon available" : "Signup coupon removed"}</strong>
              <small>{member.welcomeOffer.status === "redeemed" ? `Used ${when(member.welcomeOffer.redeemedAt)}` : member.welcomeOffer.status === "active" ? "50% off one drink with another item · one use" : "Duplicate account"}</small>
            </div>}
            {member.birthday?.isToday && <div className={`member-offer member-birthday${member.birthday.redeemedThisYear ? " member-offer-redeemed" : ""}`}>
              <div><strong>Birthday today: free drink up to ${(member.birthday.maxCents / 100).toFixed(0)}</strong><small>{member.birthday.redeemedThisYear ? "Already redeemed this year" : member.birthday.eligibleToday ? "In store only. Any drink, up to $8." : "Not eligible: birthday was added today"}</small></div>
              {member.birthday.eligibleToday && !member.birthday.redeemedThisYear && <button className="admin-save" disabled={saving === `birthday:${member.userId}`} onClick={() => redeemBirthday(member)}>{saving === `birthday:${member.userId}` ? "Saving…" : "Redeem birthday drink"}</button>}
            </div>}
          </article>;
        })}
        {members.length === 0 && <p className="empty-records">No matching loyalty members.</p>}
      </div>
      <section className="records-block"><h2>Recent points activity</h2><div className="admin-table-wrap"><table className="admin-table loyalty-ledger"><thead><tr><th>Date</th><th>Customer</th><th>Change</th><th>Balance</th><th>Reason</th></tr></thead><tbody>{data.transactions.map((entry) => <tr key={entry.id}><td>{when(entry.createdAt)}</td><td>{memberNames.get(entry.userId) || "Customer"}</td><td><strong className={entry.pointsChange >= 0 ? "points-positive" : "points-negative"}>{entry.pointsChange >= 0 ? "+" : ""}{entry.pointsChange}</strong></td><td>{entry.balanceAfter}</td><td>{entry.reason === "completed_order" ? `Completed order${entry.orderId ? ` #${entry.orderId}` : ""}` : entry.reason === "signup_bonus" ? "New member bonus" : entry.reason.replace(/^staff_adjustment:/, "Staff: ")}</td></tr>)}</tbody></table></div></section>
      </>}
    </AdminSection>
  );
}

function HoursManager() {
  const [weekly, setWeekly] = useState<WeeklyHours | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/menu-state", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ weeklyHours?: unknown; hoursNote?: string }>)
      .then((data) => { setWeekly(parseWeeklyHours(data.weeklyHours)); setNote(data.hoursNote ?? ""); })
      .catch(() => setMessage("Hours could not be loaded. Refresh to try again."));
  }, []);

  const update = (day: Weekday, changes: Partial<DayHours>) => setWeekly((current) => current && { ...current, [day]: { ...current[day], ...changes } });

  async function saveHours() {
    if (!weekly) return;
    setSaving(true);
    setMessage("Saving…");
    try {
      const response = await fetch("/api/menu-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weeklyHours: weekly, hoursNote: note }) });
      const data = await response.json() as { error?: string; weeklyHours?: unknown; hoursNote?: string };
      if (!response.ok) { setMessage(data.error || "Could not save hours."); return; }
      setWeekly(parseWeeklyHours(data.weeklyHours));
      setNote(data.hoursNote ?? "");
      setMessage("Hours published. The website and online ordering now use these hours.");
    } catch {
      setMessage("Connection interrupted. Your hours were not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminSection title="Store hours" description="These hours appear on the homepage and the Visit page. Online ordering only accepts orders during these hours and stops taking orders 30 minutes before closing. For a surprise closure, use Pause online orders on the Live orders screen.">
      {message && <AdminNotice>{message}</AdminNotice>}
      {!weekly ? <p className="empty-records">Loading hours…</p> : <div className="admin-hours-grid">
        {DISPLAY_WEEK.map((day) => <div className={`admin-hours-row${weekly[day].closed ? " is-closed" : ""}`} key={day}>
          <strong>{WEEKDAY_NAMES[day]}</strong>
          <label className="admin-check"><input type="checkbox" checked={weekly[day].closed} onChange={(event) => update(day, { closed: event.target.checked })} /> Closed</label>
          <label className="admin-hours-time"><span>Opens</span><input aria-label={`${WEEKDAY_NAMES[day]} opening time`} type="time" step={900} value={weekly[day].open} disabled={weekly[day].closed} onChange={(event) => update(day, { open: event.target.value })} /></label>
          <label className="admin-hours-time"><span>Closes</span><input aria-label={`${WEEKDAY_NAMES[day]} closing time`} type="time" step={900} value={weekly[day].close} disabled={weekly[day].closed} onChange={(event) => update(day, { close: event.target.value })} /></label>
        </div>)}
      </div>}
      <label className="admin-hours-note">Special note (optional, shown under the hours)<input value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} placeholder="Example: Closed Thursday, November 26 for Thanksgiving" /></label>
      <div className="admin-editor-actions"><button className="admin-save" disabled={saving || !weekly} onClick={saveHours}>{saving ? "Saving…" : "Save hours"}</button></div>
    </AdminSection>
  );
}

function AdminSection({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children: ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel-heading">{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{children}</section>;
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
    <div className="admin-field-row"><label className="admin-upload">{event.imageLeftUrl && <img className="admin-upload-thumb" src={event.imageLeftUrl} alt="" />}Left image<input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, (url) => field("imageLeftUrl", url)); }} /></label><label className="admin-upload">{event.imageRightUrl && <img className="admin-upload-thumb" src={event.imageRightUrl} alt="" />}Right image<input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, (url) => field("imageRightUrl", url)); }} /></label></div>
    <div className="admin-field-row"><label>Image caption<input value={event.imageCaption || ""} onChange={(e) => field("imageCaption", e.target.value)} /></label><label>Display order<input type="number" min="0" value={event.sortOrder} onChange={(e) => field("sortOrder", Number(e.target.value))} /></label></div>
    <label className="admin-check"><input type="checkbox" checked={event.published} onChange={(e) => field("published", e.target.checked)} /> Show this event publicly</label>
    <div className="admin-editor-actions"><button className="admin-save" onClick={onSave}>{event.id ? "Save event" : "Add event"}</button>{onDelete && <button className="admin-delete" onClick={onDelete}>Delete event</button>}</div>
  </div></details>;
}

function RecordsBlock({ title, rows }: { title: string; rows: Array<{ id: number; date: string | Date; heading: string; meta: string; body: string }> }) {
  return <section className="records-block"><h2>{title}</h2>{rows.length === 0 ? <p className="empty-records">Nothing submitted yet.</p> : <div className="records-list">{rows.map((row) => <article key={row.id}><header><div><strong>{row.heading}</strong><small>{row.meta}</small></div><time>{when(row.date)}</time></header><p>{row.body}</p></article>)}</div>}</section>;
}
