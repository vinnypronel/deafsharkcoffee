"use client";

import { useEffect, useMemo, useState } from "react";
import { categories, featuredProducts, menuProducts, type MenuCategory, type Product } from "./menu-data";
import { CustomerHeader, SiteFooter } from "./site-chrome";

type CartItem = {
  key: string;
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
};

type Configuration = {
  temperature: "Hot" | "Iced";
  size: "Regular" | "Large";
  milk: "Whole" | "Oat" | "Almond";
  extraShot: boolean;
  notes: string;
  quantity: number;
};

const money = (value: number) => `$${value.toFixed(2)}`;

function CupMark() {
  return (
    <span className="cup-mark" aria-hidden="true">
      <img src="/favicon.png" alt="" />
      <strong>DEAF<br />SHARK</strong>
      <span><i />COFFEE<i /></span>
    </span>
  );
}

function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const isCup = product.visual === "hot" || product.visual === "iced";
  return (
    <div className={`product-visual product-${product.visual} ${compact ? "product-visual-compact" : ""}`}>
      <div className="visual-glow" />
      {isCup && (
        <div className={`cup ${product.visual === "iced" ? "iced-cup" : "hot-cup"}`}>
          {product.visual === "iced" && <div className="ice">◆ ◇ ◆</div>}
          <CupMark />
        </div>
      )}
      {product.visual === "sandwich" && (
        <div className="sandwich" aria-hidden="true">
          <span className="bread top" /><span className="greens" /><span className="filling" /><span className="cheese" /><span className="bread bottom" />
        </div>
      )}
      {product.visual === "bite" && (
        <div className="bites-plate" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      )}
      <span className="visual-shadow" />
    </div>
  );
}

function ProductConfigurator({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [config, setConfig] = useState<Configuration>({
    temperature: "Hot",
    size: "Regular",
    milk: "Whole",
    extraShot: false,
    notes: "",
    quantity: 1,
  });

  const isCoffee = product.category === "Coffee";
  const hasTwoSizes = ["shark-cubano", "chicken-sandwich", "emilia"].includes(product.id);
  const unitPrice =
    product.price +
    (hasTwoSizes && config.size === "Large" ? 6 : 0) +
    (isCoffee && config.milk !== "Whole" ? 0.75 : 0) +
    (isCoffee && config.extraShot ? 1.25 : 0);

  function add() {
    const options: string[] = [];
    if (isCoffee) options.push(config.temperature, config.milk, config.size);
    if (hasTwoSizes) options.push(config.size);
    if (config.extraShot) options.push("Extra shot");
    if (config.notes.trim()) options.push(config.notes.trim());
    onAdd({
      key: `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      quantity: config.quantity,
      unitPrice,
      options,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="configurator" role="dialog" aria-modal="true" aria-label={`Customize ${product.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close product configurator">×</button>
        <div className="config-product">
          <ProductVisual product={{ ...product, visual: isCoffee && config.temperature === "Iced" ? "iced" : product.visual }} compact />
          <span className="eyebrow">{product.category}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <strong>{money(unitPrice)}</strong>
        </div>
        <div className="config-options">
          {isCoffee && (
            <>
              <OptionGroup label="Temperature" values={["Hot", "Iced"]} selected={config.temperature} onSelect={(value) => setConfig({ ...config, temperature: value as Configuration["temperature"] })} />
              <OptionGroup label="Milk" values={["Whole", "Oat", "Almond"]} selected={config.milk} suffix={{ Oat: "+$0.75", Almond: "+$0.75" }} onSelect={(value) => setConfig({ ...config, milk: value as Configuration["milk"] })} />
              <label className="toggle-row">
                <span><strong>Extra espresso shot</strong><small>More coffee, more momentum</small></span>
                <input type="checkbox" checked={config.extraShot} onChange={(event) => setConfig({ ...config, extraShot: event.target.checked })} />
                <i>+$1.25</i>
              </label>
            </>
          )}
          {hasTwoSizes && (
            <OptionGroup label="Size" values={["Regular", "Large"]} selected={config.size} suffix={{ Large: "+$6.00" }} onSelect={(value) => setConfig({ ...config, size: value as Configuration["size"] })} />
          )}
          <label className="notes-label">
            <span>Special instructions</span>
            <textarea value={config.notes} onChange={(event) => setConfig({ ...config, notes: event.target.value })} placeholder="Allergies or preparation notes" maxLength={180} />
          </label>
          <div className="add-row">
            <div className="quantity-control" aria-label="Quantity">
              <button onClick={() => setConfig({ ...config, quantity: Math.max(1, config.quantity - 1) })} aria-label="Decrease quantity">−</button>
              <strong>{config.quantity}</strong>
              <button onClick={() => setConfig({ ...config, quantity: config.quantity + 1 })} aria-label="Increase quantity">+</button>
            </div>
            <button className="primary-button add-button" onClick={add}>Add to order · {money(unitPrice * config.quantity)}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function OptionGroup({ label, values, selected, suffix, onSelect }: { label: string; values: string[]; selected: string; suffix?: Record<string, string>; onSelect: (value: string) => void }) {
  return (
    <fieldset className="option-group">
      <legend>{label}</legend>
      <div>
        {values.map((value) => (
          <button type="button" key={value} className={selected === value ? "selected" : ""} onClick={() => onSelect(value)}>
            {value} {suffix?.[value] && <small>{suffix[value]}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Storefront({ page = "home" }: { page?: "home" | "menu" }) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Popular");
  const [displayProduct, setDisplayProduct] = useState(featuredProducts[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [interactionStarted, setInteractionStarted] = useState(false);
  const [confirmation, setConfirmation] = useState<{ number: string; eta: string } | null>(null);
  const isMenuPage = page === "menu";

  useEffect(() => {
    if (interactionStarted) return;
    const timer = window.setInterval(() => {
      setDisplayProduct((current) => {
        const index = featuredProducts.findIndex((item) => item.id === current.id);
        return featuredProducts[(index + 1) % featuredProducts.length];
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [interactionStarted]);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const response = await fetch("/api/menu-state", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability ?? {});
        }
      } catch {
        // Menu remains available if the demo database is not connected yet.
      }
    }
    loadAvailability();
    const timer = window.setInterval(loadAvailability, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleProducts = useMemo(
    () => activeCategory === "Popular" ? menuProducts.filter((product) => product.popular) : menuProducts.filter((product) => product.category === activeCategory),
    [activeCategory],
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function openProduct(product: Product) {
    if (availability[product.id] === false) return;
    setInteractionStarted(true);
    setDisplayProduct(product);
    setSelectedProduct(product);
  }

  function addToCart(item: CartItem) {
    setCart((current) => [...current, item]);
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function rememberOrder(order: { orderNumber: string; phone: string }) {
    try {
      const key = "deaf-shark-customer-orders";
      const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as { orderNumber: string; phone: string }[];
      const next = [order, ...current.filter((item) => item.orderNumber !== order.orderNumber)].slice(0, 12);
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("deaf-shark-orders-updated"));
    } catch {
      // Order confirmation still works when browser storage is unavailable.
    }
  }

  return (
    <main>
      <CustomerHeader active={isMenuPage ? "/menu" : "/"} action={<button className="header-cart" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${cartCount} items`}>
          Cart <span>{cartCount}</span>
        </button>} />

      {!isMenuPage && <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">Roasted in Union, New Jersey</span>
          <h1><span>Coffee from</span><span>El Salvador.</span><em>Roasted in Union.</em></h1>
          <p>Fresh coffee, breakfast, sandwiches, and Latin favorites, ready when you are.</p>
          <div className="hero-actions">
            <a className="primary-button" href="/menu">Order pickup</a>
            <a className="text-button" href="/about">Meet the coffee <span>↘</span></a>
          </div>
          <div className="hero-details">
            <span><strong>Open today</strong> Demo hours</span>
            <span><strong>Pickup</strong> Ready in 15 min</span>
          </div>
        </div>
        <div className="hero-product" aria-live="polite">
          <ProductVisual product={displayProduct} />
          <div className="hero-product-caption">
            <span>{displayProduct.category}</span>
            <strong>{displayProduct.name}</strong>
            <button onClick={() => openProduct(displayProduct)}>Customize · {money(displayProduct.price)}</button>
          </div>
          <div className="product-dots" aria-label="Featured products">
            {featuredProducts.map((product) => (
              <button key={product.id} className={product.id === displayProduct.id ? "active" : ""} onClick={() => { setInteractionStarted(true); setDisplayProduct(product); }} aria-label={`Show ${product.name}`} />
            ))}
          </div>
        </div>
      </section>}

      <section className={`order-section ${isMenuPage ? "standalone-order" : ""}`} id="menu">
        <div className="order-intro">
          <span className="eyebrow">Order for pickup</span>
          <h2>{isMenuPage ? "The full menu, ready your way." : "Your favorites, without the wait."}</h2>
          <p>Browse the menu, customize your order, and choose how you want to pay.</p>
        </div>
        <div className="menu-shell">
          <aside className="menu-display">
            <ProductVisual product={displayProduct} />
            <div>
              <span className="eyebrow">Currently showing</span>
              <h3>{displayProduct.name}</h3>
              <p>{displayProduct.description}</p>
              <button className="soft-button" onClick={() => openProduct(displayProduct)}>Customize {money(displayProduct.price)}</button>
            </div>
          </aside>
          <div className="menu-content">
            <div className="category-nav" role="tablist" aria-label="Menu categories">
              {categories.map((category) => (
                <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
            <div className="menu-heading">
              <div><span className="eyebrow">Menu</span><h3>{activeCategory}</h3></div>
              <span>Demo menu, final details to be confirmed</span>
            </div>
            <div className="product-list">
              {visibleProducts.map((product) => {
                const soldOut = availability[product.id] === false;
                return (
                  <button key={product.id} className={`product-row ${soldOut ? "sold-out" : ""}`} onClick={() => openProduct(product)} disabled={soldOut}>
                    <span><strong>{product.name}</strong><small>{product.description}</small></span>
                    <span className="row-price">{soldOut ? "Sold out" : money(product.price)}<i>+</i></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {!isMenuPage && <section className="origin-section" id="coffee">
        <div className="origin-art">
          <img src="/deafshark-dog-art.png" alt="Deaf Shark illustrated dog character beside coffee artwork" />
        </div>
        <div className="origin-copy">
          <span className="eyebrow">The coffee</span>
          <h2>One farm. One variety. A cup with a place behind it.</h2>
          <p>Our featured coffee comes from Finca Montevideo in El Salvador. Red Bourbon beans are washed, roasted with care, and served here in Union.</p>
          <dl>
            <div><dt>Origin</dt><dd>El Salvador</dd></div>
            <div><dt>Farm</dt><dd>Finca Montevideo</dd></div>
            <div><dt>Variety</dt><dd>Red Bourbon</dd></div>
            <div><dt>Process</dt><dd>Washed</dd></div>
          </dl>
        </div>
      </section>}

      {!isMenuPage && <section className="visit-section" id="visit">
        <div><span className="eyebrow">Come visit</span><h2>Deaf Shark Coffee<br />Union, New Jersey</h2></div>
        <div className="visit-card"><strong>900 Green Lane</strong><span>Union, NJ 07083</span><a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083">Get directions</a></div>
        <div className="visit-card"><strong>(908) 481-8884</strong><span>Call ahead or stop in</span><a href="tel:+19084818884">Call the shop</a></div>
      </section>}

      <SiteFooter />

      <button className={`mobile-cart ${cartCount ? "visible" : ""}`} onClick={() => setCartOpen(true)}>
        <span>{cartCount} {cartCount === 1 ? "item" : "items"}</span><strong>View cart · {money(subtotal)}</strong>
      </button>

      {selectedProduct && <ProductConfigurator product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
      {cartOpen && (
        <CartDrawer cart={cart} subtotal={subtotal} onClose={() => setCartOpen(false)} onRemove={(key) => setCart((current) => current.filter((item) => item.key !== key))} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      )}
      {checkoutOpen && (
        <Checkout cart={cart} subtotal={subtotal} onClose={() => setCheckoutOpen(false)} onComplete={(number, eta, phone) => { rememberOrder({ orderNumber: number, phone }); setCheckoutOpen(false); setCart([]); setConfirmation({ number, eta }); }} />
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section className="confirmation-card" role="dialog" aria-modal="true">
            <img src="/deafshark-dog-art.png" alt="Deaf Shark character" />
            <span className="eyebrow">Order received</span>
            <h2>We have it, {confirmation.number}.</h2>
            <p>Your pickup estimate is <strong>{confirmation.eta}</strong>. We will update your order status as it moves through the counter.</p>
            <div className="confirmation-actions"><button className="primary-button" onClick={() => { setConfirmation(null); window.dispatchEvent(new Event("deaf-shark-open-order")); }}>View order status</button><button className="soft-button" onClick={() => setConfirmation(null)}>Back to the menu</button></div>
          </section>
        </div>
      )}
    </main>
  );
}

function CartDrawer({ cart, subtotal, onClose, onRemove, onCheckout }: { cart: CartItem[]; subtotal: number; onClose: () => void; onRemove: (key: string) => void; onCheckout: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="cart-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><span className="eyebrow">Pickup order</span><h2>Your cart</h2></div><button onClick={onClose} aria-label="Close cart">×</button></div>
        <div className="cart-items">
          {cart.length === 0 && <div className="empty-cart"><img src="/favicon.png" alt="" /><h3>Your cart is ready when you are.</h3><p>Choose a drink, breakfast, sandwich, or bite from the menu.</p></div>}
          {cart.map((item) => (
            <article key={item.key} className="cart-item"><span>{item.quantity}</span><div><strong>{item.name}</strong><small>{item.options.join(" · ")}</small><button onClick={() => onRemove(item.key)}>Remove</button></div><strong>{money(item.unitPrice * item.quantity)}</strong></article>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxes are calculated at checkout.</small><button className="primary-button" onClick={onCheckout}>Continue to checkout</button></div>}
      </aside>
    </div>
  );
}

function Checkout({ cart, subtotal, onClose, onComplete }: { cart: CartItem[]; subtotal: number; onClose: () => void; onComplete: (number: string, eta: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<"pickup" | "card">("pickup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const tax = subtotal * 0.06625;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: name, phone, paymentMethod: payment, pickupEta: "15 min", items: cart }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to place order");
      onComplete(data.order.orderNumber, data.order.pickupEta, phone);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="checkout-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close checkout">×</button>
        <span className="eyebrow">Pickup in about 15 minutes</span><h2>Finish your order</h2>
        <label><span>Name for the order</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
        <label><span>Mobile number</span><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(908) 555-0123" /></label>
        <fieldset className="payment-options"><legend>Payment</legend><label><input type="radio" name="payment" checked={payment === "pickup"} onChange={() => setPayment("pickup")} /><span><strong>Pay at pickup</strong><small>Pay at the counter when you arrive</small></span></label><label><input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} /><span><strong>Card payment demo</strong><small>Production payment provider to be confirmed</small></span></label></fieldset>
        <div className="checkout-total"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Estimated tax</span><strong>{money(tax)}</strong></div><div><span>Total</span><strong>{money(subtotal + tax)}</strong></div></div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={submitting}>{submitting ? "Sending order..." : `Place pickup order · ${money(subtotal + tax)}`}</button>
      </form>
    </div>
  );
}
