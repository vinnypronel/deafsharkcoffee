import { itemBreakdown, money, orderTotalLines, signedMoney, type OrderMoney, type StoredLineItem } from "./order-lines";

/* Receipt pieces shared by the customer's order page, their account and the
   dashboard order history, so an item and its extras read the same everywhere. */

/** Item name with its line price, then each paid extra with its charge, then the plain choices. */
export function PricedItem({ item, showQuantity = true }: { item: StoredLineItem; showQuantity?: boolean }) {
  const lines = itemBreakdown(item);
  const paid = lines.details.filter((detail) => detail.cents);
  const plain = lines.details.filter((detail) => !detail.cents);
  const quantity = Math.max(1, item.quantity || 1);
  return (
    <div className="priced-item">
      <div className="priced-item-head">
        <strong>{showQuantity ? `${quantity} × ` : ""}{item.name}</strong>
        {lines.lineCents !== undefined && <b>{money(lines.lineCents)}</b>}
      </div>
      {(paid.length > 0 || quantity > 1) && lines.baseCents !== undefined && (
        <small className="priced-item-line"><span>{item.name}{quantity > 1 ? ", each" : ""}</span><span>{money(lines.baseCents)}</span></small>
      )}
      {paid.map((detail, index) => (
        <small className="priced-item-line" key={index}><span>{detail.label}</span><span>+{money(detail.cents ?? 0)}</span></small>
      ))}
      {plain.length > 0 && <small className="priced-item-plain">{plain.map((detail) => detail.label).join(" · ")}</small>}
    </div>
  );
}

/** Subtotal, discount, tax and total. */
export function OrderMoneyLines({ order }: { order: OrderMoney }) {
  return (
    <dl className="order-money-lines">
      {orderTotalLines(order).map((line) => (
        <div key={line.label} className={line.strong ? "is-total" : undefined}>
          <dt>{line.label}</dt>
          <dd>{signedMoney(line.cents)}</dd>
        </div>
      ))}
    </dl>
  );
}
