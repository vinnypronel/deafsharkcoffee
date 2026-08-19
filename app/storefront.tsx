"use client";

import { useEffect, useMemo, useState } from "react";
import ScrollHero from "./scroll-hero";
import { categories, featuredProducts, menuProducts, type MenuCategory, type Product } from "./menu-data";
import { CustomerHeader, SiteFooter } from "./site-chrome";
import "./drink-visuals.css";

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
  extraShot: number;
  notes: string;
  quantity: number;
};

const MAX_SHOTS = 5;

const money = (value: number) => `$${value.toFixed(2)}`;

const CUP_PHOTOS = { hot: "/cup-hot.png", iced: "/cup-cold.png" } as const;

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
  const photo = product.photo || (isCup ? CUP_PHOTOS[product.visual as "hot" | "iced"] : (product.visual === "sandwich" || product.category === "Sandwiches" || product.category === "Breakfast" ? "/chicken-pesto-centered.jpg" : undefined));
  if (photo) {
    return (
      <div className={`product-visual product-${product.visual} ${compact ? "product-visual-compact" : ""}`}>
        <div className="visual-glow" />
        <img className="product-photo" src={photo} alt={product.name} />
        <span className="visual-shadow" />
      </div>
    );
  }
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
      {product.visual === "bag" && (
        <img className="coffee-bag-photo" src="/ocean-blend-bags.jpg" alt="Deaf Shark Ocean Blend medium roast coffee bags" />
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
    extraShot: 0,
    notes: "",
    quantity: 1,
  });

  const isCoffee = product.category === "Coffee";
  const hasTwoSizes = ["shark-cubano", "chicken-sandwich", "emilia"].includes(product.id);
  const unitPrice =
    product.price +
    (hasTwoSizes && config.size === "Large" ? 6 : 0) +
    (isCoffee && config.milk !== "Whole" ? 0.75 : 0) +
    (isCoffee ? config.extraShot * 1.25 : 0);

  function add() {
    const options: string[] = [];
    if (isCoffee) options.push(config.temperature, config.milk, config.size);
    if (hasTwoSizes) options.push(config.size);
    if (config.extraShot) options.push(config.extraShot === 1 ? "Extra shot" : `${config.extraShot} extra shots`);
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
      <section className="configurator" data-lenis-prevent role="dialog" aria-modal="true" aria-label={`Customize ${product.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close product configurator">×</button>
        <div className="config-product">
          <ProductVisual
            product={{
              ...product,
              visual: isCoffee ? (config.temperature === "Hot" ? "hot" : "iced") : product.visual,
              photo: isCoffee
                ? (config.temperature === "Hot" ? "/cup-hot.png" : (product.photo || "/drink-iced-latte.webp"))
                : (product.photo || (product.visual === "sandwich" || product.category === "Breakfast" || product.category === "Sandwiches" ? "/chicken-pesto-centered.jpg" : undefined)),
            }}
          />
          <div className="config-product-info">
            <span className="eyebrow">{product.category}</span>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <strong>{money(unitPrice)}</strong>
          </div>
        </div>
        <div className="config-options">
          {isCoffee && (
            <>
              <OptionGroup label="Temperature" values={["Hot", "Iced"]} selected={config.temperature} onSelect={(value) => setConfig({ ...config, temperature: value as Configuration["temperature"] })} />
              <OptionGroup label="Milk" values={["Whole", "Oat", "Almond"]} selected={config.milk} suffix={{ Oat: "+$0.75", Almond: "+$0.75" }} onSelect={(value) => setConfig({ ...config, milk: value as Configuration["milk"] })} />
              <div className="toggle-row">
                <span><strong>Extra espresso shots</strong><small>More coffee, more momentum</small></span>
                <div className="quantity-control shot-control" aria-label="Extra espresso shots">
                  <button onClick={() => setConfig({ ...config, extraShot: Math.max(0, config.extraShot - 1) })} disabled={config.extraShot === 0} aria-label="Remove an espresso shot">−</button>
                  <strong aria-live="polite">{config.extraShot}</strong>
                  <button onClick={() => setConfig({ ...config, extraShot: Math.min(MAX_SHOTS, config.extraShot + 1) })} disabled={config.extraShot === MAX_SHOTS} aria-label="Add an espresso shot">+</button>
                </div>
                <i>+$1.25 each</i>
              </div>
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
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Coffee");
  const [heroProduct, setHeroProduct] = useState(featuredProducts[0]);
  const [menuShowcaseProduct, setMenuShowcaseProduct] = useState<Product>(
    menuProducts.find((p) => p.category === "Coffee") ?? menuProducts[0]
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [interactionStarted, setInteractionStarted] = useState(false);
  const [confirmation, setConfirmation] = useState<{ number: string; eta: string } | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<Product | null>(null);
  const isMenuPage = page === "menu";
  const oceanBlend = menuProducts.find((product) => product.id === "ocean-blend-bag")!;

  useEffect(() => {
    if (!activeVideoModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveVideoModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeVideoModal]);

  useEffect(() => {
    if (activeVideoModal) return;
    const timer = window.setInterval(() => {
      setHeroProduct((current) => {
        const index = featuredProducts.findIndex((item) => item.id === current.id);
        return featuredProducts[(index + 1) % featuredProducts.length];
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeVideoModal, heroProduct.id]);

  useEffect(() => {
    const itemId = new URLSearchParams(window.location.search).get("item");
    if (!itemId) return;
    const product = menuProducts.find((candidate) => candidate.id === itemId);
    if (!product) return;
    setInteractionStarted(true);
    setMenuShowcaseProduct(product);
    setActiveCategory(product.category);
    setSelectedProduct(product);
  }, []);

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
    () => menuProducts.filter((product) => product.category === activeCategory),
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
      <CustomerHeader
        active={isMenuPage ? "/menu" : "/"}
        action={
          <button className="header-cart" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${cartCount} items`}>
            <svg className="cart-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>{cartCount}</span>
          </button>
        }
      />

      {!isMenuPage && <ScrollHero scrollHeights={3}>
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">Roasted in Union, New Jersey</span>
          <h1><span>Coffee from</span><span>El Salvador.</span><em>Roasted in Union.</em></h1>
          <div className="hero-actions">
            <a className="primary-button hero-cta-btn" href="/menu">
              <span>Order pickup</span>
              <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a className="secondary-button hero-cta-btn" href="/about">
              <span>Read our story</span>
              <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
        <div className="hero-product" aria-live="polite">
          {heroProduct.video ? (
            <div className="hero-featured-video-wrap">
              <video
                key={heroProduct.id}
                src={heroProduct.video}
                autoPlay
                muted
                loop
                playsInline
                className="hero-featured-video"
              />
              <button
                className="hero-video-play-btn"
                onClick={() => setActiveVideoModal(heroProduct)}
                aria-label={`Play ${heroProduct.name} video with sound`}
                title="Play video with sound"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          ) : (
            <ProductVisual product={heroProduct} />
          )}
          <div className="hero-product-caption">
            <div className="hero-product-text">
              <span>{heroProduct.category}</span>
              <strong>{heroProduct.name}</strong>
            </div>
            <button className="hero-add-btn" onClick={() => openProduct(heroProduct)}>
              <span>Add to cart · {money(heroProduct.price)}</span>
              <svg className="btn-cart-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </button>
          </div>
          <div className="product-dots" aria-label="Featured products">
            {featuredProducts.map((product) => {
              const isActive = product.id === heroProduct.id;
              return (
                <button
                  key={product.id}
                  className={isActive ? "active" : ""}
                  onClick={() => setHeroProduct(product)}
                  aria-label={`Show ${product.name}`}
                >
                  {isActive && <span key={`${product.id}-timer`} className="dot-fill" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>
      </ScrollHero>}

      <section className={`order-section ${isMenuPage ? "standalone-order" : ""}`} id="menu">
        <div className="order-intro">
          <div className="order-intro-text">
            <h2>{isMenuPage ? "The full menu, ready your way." : "Salvadoran roasts, poured ice-cold."}</h2>
          </div>
          <img src="/deafshark-logo.png" alt="Deaf Shark Coffee" className="order-section-badge" />
        </div>

        {isMenuPage && (
          <div className="category-nav-wrap">
            <div className="category-nav" role="tablist" aria-label="Menu categories">
              {categories.map((category) => (
                <button
                  key={category}
                  role="tab"
                  aria-selected={activeCategory === category}
                  className={activeCategory === category ? "active" : ""}
                  onClick={() => {
                    setActiveCategory(category);
                    const firstOfCategory = menuProducts.find((p) => p.category === category);
                    if (firstOfCategory) setMenuShowcaseProduct(firstOfCategory);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="menu-showcase-grid">
          {/* Left Column: Clean Product Card + Pill */}
          <aside className="menu-product-card-wrap">
            <div className="menu-product-card">
              <ProductVisual product={menuShowcaseProduct} />
              <button
                className="menu-card-pill"
                onClick={() => openProduct(menuShowcaseProduct)}
                aria-label={`Customize ${menuShowcaseProduct.name}`}
              >
                {menuShowcaseProduct.name} · {money(menuShowcaseProduct.price)}
              </button>
            </div>
            <div className="menu-card-brand">
              <img src="/favicon.png" alt="" />
              <div className="menu-brand-text">
                <strong>DEAF SHARK COFFEE</strong>
                <span className="brand-dot">·</span>
                <small>Roasted in Union.</small>
              </div>
            </div>
          </aside>

          {/* Right Column: Menu List with Dotted Leaders */}
          <div className="menu-list-panel">
            <div className="menu-panel-header">
              <div>
                <h3>{isMenuPage ? activeCategory : "Iced Beverages"}</h3>
              </div>
              <span className="menu-milk-note">Every drink is available with oat or almond milk · +$0.75</span>
            </div>

            <div className="menu-items-list">
              {(isMenuPage ? visibleProducts : menuProducts.filter((p) => p.visual === "iced" && p.photo)).map((product) => {
                const soldOut = availability[product.id] === false;
                const isSelected = menuShowcaseProduct.id === product.id;
                return (
                  <button
                    key={product.id}
                    className={`menu-item-row ${isSelected ? "selected" : ""} ${soldOut ? "sold-out" : ""}`}
                    onClick={() => openProduct(product)}
                    onMouseEnter={() => setMenuShowcaseProduct(product)}
                    disabled={soldOut}
                  >
                    <div className="item-info">
                      <div className="item-name-line">
                        <strong>{product.name}</strong>
                      </div>
                      <small>{product.description}</small>
                    </div>
                    <span className="item-leader" aria-hidden="true" />
                    <span className="item-price">
                      {soldOut ? "Sold out" : money(product.price)}
                    </span>
                  </button>
                );
              })}
            </div>

            {!isMenuPage && (
              <div className="menu-bottom-actions">
                <a href="/menu" className="primary-button hero-cta-btn menu-full-button">
                  <span>View our full menu</span>
                  <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {!isMenuPage && <section className="take-home-section">
        <div className="take-home-image">
          <img src="/ocean-blend-bags.jpg" alt="Deaf Shark Ocean Blend coffee bags displayed in the Union shop" />
        </div>
        <div className="take-home-copy">
          <span className="eyebrow">Ocean Blend</span>
          <h2>Take the roast home.</h2>
          <p>A 12 oz bag of medium roast whole bean coffee from El Salvador, roasted in Union and ready for your home setup.</p>
          <ul className="take-home-features">
            <li>Medium roast</li>
            <li>Whole bean</li>
            <li>12 oz bag</li>
          </ul>
          <button className="primary-button take-home-btn" onClick={() => openProduct(oceanBlend)}>
            <span>Order a bag · {money(oceanBlend.price)}</span>
            <svg className="btn-cart-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
        <div className="take-home-film">
          <video autoPlay muted loop playsInline preload="metadata" poster="/ocean-blend-bags.jpg" aria-label="Deaf Shark Ocean Blend bags on display">
            <source src="/ocean-blend-bags.mp4" type="video/mp4" />
          </video>
        </div>
      </section>}

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

      {!isMenuPage && (
        <section className="visit-section" id="visit">
          <div className="visit-header-block">
            <div>
              <span className="eyebrow">Come visit</span>
              <h2>Deaf Shark Coffee<br />Union, New Jersey</h2>
            </div>
            <div className="visit-cards-row">
              <div className="visit-card">
                <span className="visit-card-label">Address</span>
                <strong>900 Green Lane</strong>
                <span>Union, NJ 07083</span>
                <a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get directions ↗</a>
              </div>
              <div className="visit-card">
                <span className="visit-card-label">August Hours</span>
                <strong>9:00 AM – 5:00 PM</strong>
                <span>Open daily for August</span>
                <a href="/menu">Order ahead ↗</a>
              </div>
              <div className="visit-card">
                <span className="visit-card-label">Contact</span>
                <strong>(908) 481-8884</strong>
                <span>Call ahead or stop in</span>
                <a href="tel:+19084818884">Call shop ↗</a>
              </div>
            </div>
          </div>
          <div className="visit-map-container">
            <iframe
              title="Deaf Shark Coffee Map Location"
              src="https://maps.google.com/maps?q=900+Green+Lane,+Union,+NJ+07083&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="visit-map-frame"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      )}

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

      {activeVideoModal && (
        <div
          className="video-modal-backdrop"
          onClick={() => setActiveVideoModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeVideoModal.name} video presentation`}
        >
          <div
            className="video-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="video-modal-close"
              onClick={() => setActiveVideoModal(null)}
              aria-label="Close video"
            >
              ×
            </button>
            <div className="video-modal-media-wrap">
              <video
                src={activeVideoModal.video}
                autoPlay
                controls
                playsInline
                className="video-modal-player"
              />
            </div>
            <div className="video-modal-details">
              <div>
                <span className="video-modal-category">{activeVideoModal.category}</span>
                <h3>{activeVideoModal.name}</h3>
                <p>{activeVideoModal.description}</p>
              </div>
              <button
                className="primary-button video-modal-order-btn"
                onClick={() => {
                  const target = activeVideoModal;
                  setActiveVideoModal(null);
                  openProduct(target);
                }}
              >
                Order now · {money(activeVideoModal.price)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CartDrawer({ cart, subtotal, onClose, onRemove, onCheckout }: { cart: CartItem[]; subtotal: number; onClose: () => void; onRemove: (key: string) => void; onCheckout: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="cart-drawer" data-lenis-prevent onMouseDown={(event) => event.stopPropagation()}>
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
      <form className="checkout-card" data-lenis-prevent onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
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
