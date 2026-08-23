"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ScrollHero from "./scroll-hero";
import {
  categories,
  EXTRA_SHOT_PRICE,
  featuredProducts,
  menuProducts,
  MILK_OPTIONS,
  modifierGroupsForProduct,
  prepStationFor,
  priceProductSelection,
  SYRUP_OPTIONS,
  SYRUP_PRICE,
  type ModifierGroup,
  type MenuCategory,
  type PrepStation,
  type Product,
  type ProductSelection,
} from "./menu-data";
import { CustomerHeader, SiteFooter } from "./site-chrome";
import "./drink-visuals.css";

type CartItem = {
  key: string;
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
  prepStation: PrepStation;
  selection?: ProductSelection;
};

type SchedulingSettings = {
  enabled: boolean;
  horizonMinutes: number;
  slotMinutes: number;
};

type Configuration = {
  temperature: "Hot" | "Iced";
  /* A size label from the product, or the sandwich Regular/Large. */
  size: string;
  milk: MilkChoice;
  /* Pick-one list: tea flavor, or which sandwich on the lunch special. */
  flavor: string;
  /* Smoothie base. */
  base: string;
  extraShot: number;
  syrups: SyrupFlavor[];
  modifiers: Record<string, string[]>;
  notes: string;
  quantity: number;
};

type SyrupFlavor = (typeof SYRUP_OPTIONS)[number];
type MilkChoice = "None" | (typeof MILK_OPTIONS)[number];

const MAX_SHOTS = 5;

const temperaturesFor = (product: Product): ("Hot" | "Iced")[] => {
  if (product.sizing) {
    const list: ("Hot" | "Iced")[] = [];
    if (product.sizing.hot?.length) list.push("Hot");
    if (product.sizing.iced?.length) list.push("Iced");
    if (list.length) return list;
  }
  return product.temps ?? ["Hot", "Iced"];
};

const sizesFor = (product: Product, temperature: "Hot" | "Iced") =>
  (temperature === "Hot" ? product.sizing?.hot : product.sizing?.iced) ?? [];

const DRINK_CATEGORIES: MenuCategory[] = ["Coffee", "Non-Coffee"];
const categoryId = (category: string) => "menu-cat-" + category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const money = (value: number) => `$${value.toFixed(2)}`;

const priceLabel = (product: Product) => {
  const prices = [
    ...(product.sizing?.hot ?? []),
    ...(product.sizing?.iced ?? []),
  ].map((entry) => entry.price);
  const lowest = prices.length ? Math.min(...prices) : product.price;
  return money(lowest);
};

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
  initialItem,
  onClose,
  onAdd,
}: {
  product: Product;
  initialItem?: CartItem;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const isDrink = product.category === "Coffee" || product.category === "Non-Coffee";
  const isSmoothie = !!product.bases?.length;
  const hasMilkOptions =
    isDrink && !isSmoothie && !["chicha", "malta", "hot-tea"].includes(product.id);
  const availableTemps = temperaturesFor(product);
  const hasTempOptions = isDrink && availableTemps.length > 1;
  const hasSyrupOptions = isDrink && !isSmoothie && product.id !== "hot-tea";
  const hasShotOptions =
    (product.category === "Coffee" || ["matcha-latte", "strawberry-matcha", "mango-matcha", "chai-tea-latte"].includes(product.id)) &&
    product.id !== "hot-tea";
  const hasFlavorOptions = !!product.flavors?.length;
  const modifierGroups: ModifierGroup[] = modifierGroupsForProduct(product);

  const defaultMilk: MilkChoice = ["americano", "drip-coffee", "espresso", "cold-brew", "chicha", "malta", "red-eye", "decaf-coffee", "regular-coffee"].includes(product.id) ? "None" : "Whole";
  const defaultTemp = availableTemps.includes("Iced") ? "Iced" : "Hot";

  const [config, setConfig] = useState<Configuration>(() => {
    if (!initialItem) {
      return {
        temperature: defaultTemp,
        size: sizesFor(product, defaultTemp)[0]?.label ?? "Regular",
        milk: defaultMilk,
        flavor: product.flavors?.[0] ?? "",
        base: product.bases?.[0] ?? "",
        extraShot: 0,
        syrups: [],
        modifiers: Object.fromEntries(
          modifierGroups.map((group) => [
            group.label,
            group.required && group.options[0] ? [group.options[0].label] : [],
          ]),
        ),
        notes: "",
        quantity: 1,
      };
    }
    const opts = initialItem.options || [];
    const temp: "Hot" | "Iced" = opts.includes("Hot") ? "Hot" : "Iced";
    const sizeLabels = sizesFor(product, temp).map((entry) => entry.label);
    const size =
      opts.find((o) => sizeLabels.includes(o)) ??
      (opts.includes("Large") ? "Large" : sizeLabels[0] ?? "Regular");
    let milk: MilkChoice = defaultMilk;
    const milkOpt = opts.find((o) => (MILK_OPTIONS as readonly string[]).includes(o));
    if (milkOpt) milk = milkOpt as MilkChoice;
    else if (opts.includes("No milk")) milk = "None";

    const flavor = product.flavors?.find((f) => opts.includes(f)) ?? product.flavors?.[0] ?? "";
    const base = product.bases?.find((b) => opts.includes(`${b} base`)) ?? product.bases?.[0] ?? "";

    let extraShot = 0;
    const shotOpt = opts.find((o) => o.includes("extra shot") || o.includes("Extra shot"));
    if (shotOpt) {
      const match = shotOpt.match(/(\d+)/);
      extraShot = match ? parseInt(match[1], 10) : 1;
    }

    const syrups: SyrupFlavor[] = [];
    const syrupOpt = opts.find((o) => o.startsWith("Syrup:"));
    if (syrupOpt) {
      const syrupList = syrupOpt.replace("Syrup:", "").split(",").map((s) => s.trim());
      for (const s of syrupList) {
        if (SYRUP_OPTIONS.includes(s as SyrupFlavor)) syrups.push(s as SyrupFlavor);
      }
    }

    const modifiers = Object.fromEntries(
      modifierGroups.map((group) => {
        const selected = group.options
          .filter((option) => opts.includes(`${group.label}: ${option.label}`))
          .map((option) => option.label);
        return [
          group.label,
          selected.length
            ? selected
            : group.required && group.options[0]
              ? [group.options[0].label]
              : [],
        ];
      }),
    );

    const knownPrefixes = [
      "Hot", "Iced", "Large", "Regular", "No milk", "Syrup:", "Extra shot", "extra shot",
      ...MILK_OPTIONS, ...sizeLabels, ...(product.flavors ?? []),
      ...(product.bases ?? []).map((b) => `${b} base`),
      ...modifierGroups.flatMap((group) => group.options.map((option) => `${group.label}: ${option.label}`)),
    ];
    const noteOpt = opts.find((o) => !knownPrefixes.some((prefix) => o.startsWith(prefix)));

    return {
      temperature: temp,
      size,
      milk,
      flavor,
      base,
      extraShot,
      syrups,
      modifiers,
      notes: noteOpt || "",
      quantity: initialItem.quantity || 1,
    };
  });

  const hasTwoSizes = ["shark-cubano", "chicken-sandwich", "emilia"].includes(product.id);
  const drinkSizes = sizesFor(product, config.temperature);
  const pricedSelection = priceProductSelection(product, config);
  const unitPrice = pricedSelection.unitPrice;

  /* Iced pours are 16 oz only, so switching temperature re-picks the size. */
  const setTemperature = (value: "Hot" | "Iced") => {
    const nextSizes = sizesFor(product, value);
    setConfig({
      ...config,
      temperature: value,
      size: nextSizes.some((entry) => entry.label === config.size)
        ? config.size
        : nextSizes[0]?.label ?? config.size,
    });
  };

  function add() {
    onAdd({
      key: initialItem?.key ?? `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      quantity: config.quantity,
      unitPrice,
      options: pricedSelection.options,
      prepStation: prepStationFor(product),
      selection: pricedSelection.selection,
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
              visual: isDrink ? (config.temperature === "Hot" ? "hot" : "iced") : product.visual,
              photo: isDrink
                ? (config.temperature === "Hot" ? "/cup-hot.png" : (product.photo || "/drink-iced-latte.webp"))
                : (product.photo || (product.visual === "sandwich" || product.category === "Breakfast" || product.category === "Sandwiches" ? "/chicken-pesto-centered.jpg" : undefined)),
            }}
          />
          <div className="config-product-info">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <strong>{money(unitPrice)}</strong>
          </div>
        </div>
        <div className="config-options">
          {hasFlavorOptions && (
            <OptionGroup
              label={product.flavorLabel || "Flavor"}
              values={product.flavors as string[]}
              selected={config.flavor}
              onSelect={(value) => setConfig({ ...config, flavor: value })}
            />
          )}
          {hasTempOptions && (
            <OptionGroup
              label="Temperature"
              values={availableTemps}
              selected={config.temperature}
              onSelect={(value) => setTemperature(value as "Hot" | "Iced")}
            />
          )}
          {drinkSizes.length > 1 && (
            <OptionGroup
              label="Size"
              values={drinkSizes.map((entry) => entry.label)}
              selected={config.size}
              suffix={Object.fromEntries(drinkSizes.map((entry) => [entry.label, money(entry.price)]))}
              onSelect={(value) => setConfig({ ...config, size: value })}
            />
          )}
          {isSmoothie && (
            <OptionGroup
              label="Blended with"
              values={product.bases as string[]}
              selected={config.base}
              onSelect={(value) => setConfig({ ...config, base: value })}
            />
          )}
          {hasMilkOptions && (
            <OptionGroup
              label="Milk"
              values={MILK_OPTIONS as unknown as string[]}
              selected={config.milk}
              allowDeselect
              onSelect={(value) => setConfig({ ...config, milk: value as MilkChoice })}
            />
          )}
          {hasSyrupOptions && (
            <fieldset className="option-group">
              <legend>Flavor syrups</legend>
              <div className="syrup-grid">
                {SYRUP_OPTIONS.map((flavor) => {
                  const isSelected = config.syrups.includes(flavor);
                  return (
                    <button
                      type="button"
                      key={flavor}
                      className={`syrup-pill ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setConfig({
                          ...config,
                          syrups: isSelected
                            ? config.syrups.filter((s) => s !== flavor)
                            : [...config.syrups, flavor],
                        });
                      }}
                      aria-pressed={isSelected}
                    >
                      <span className="syrup-name">{flavor}</span>
                      <small>+{money(SYRUP_PRICE)}</small>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {hasShotOptions && (
            <div className="toggle-row">
              <span><strong>Extra espresso shots</strong></span>
              <div className="quantity-control shot-control" aria-label="Extra espresso shots">
                <button onClick={() => setConfig({ ...config, extraShot: Math.max(0, config.extraShot - 1) })} disabled={config.extraShot === 0} aria-label="Remove an espresso shot">−</button>
                <strong aria-live="polite">{config.extraShot}</strong>
                <button onClick={() => setConfig({ ...config, extraShot: Math.min(MAX_SHOTS, config.extraShot + 1) })} disabled={config.extraShot === MAX_SHOTS} aria-label="Add an espresso shot">+</button>
              </div>
              <i>+{money(EXTRA_SHOT_PRICE)} each</i>
            </div>
          )}
          {hasTwoSizes && (
            <OptionGroup label="Size" values={["Regular", "Large"]} selected={config.size} suffix={{ Large: "+$6.00" }} onSelect={(value) => setConfig({ ...config, size: value })} />
          )}
          {modifierGroups.map((group) => {
            const selected = config.modifiers[group.label] ?? [];
            const suffix = Object.fromEntries(
              group.options
                .filter((option) => option.price)
                .map((option) => [option.label, `+${money(option.price ?? 0)}`]),
            );
            if (group.type === "single") {
              return (
                <OptionGroup
                  key={group.label}
                  label={group.label}
                  values={group.options.map((option) => option.label)}
                  selected={selected[0] ?? ""}
                  suffix={suffix}
                  allowDeselect={!group.required}
                  onSelect={(value) => setConfig({
                    ...config,
                    modifiers: { ...config.modifiers, [group.label]: value === "None" ? [] : [value] },
                  })}
                />
              );
            }
            return (
              <fieldset className="option-group" key={group.label}>
                <legend>{group.label}</legend>
                <div className="syrup-grid">
                  {group.options.map((option) => {
                    const isSelected = selected.includes(option.label);
                    return (
                      <button
                        type="button"
                        key={option.label}
                        className={`syrup-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => setConfig({
                          ...config,
                          modifiers: {
                            ...config.modifiers,
                            [group.label]: isSelected
                              ? selected.filter((value) => value !== option.label)
                              : [...selected, option.label],
                          },
                        })}
                        aria-pressed={isSelected}
                      >
                        <span className="syrup-name">{option.label}</span>
                        {option.price ? <small>+{money(option.price)}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
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
            <button className="primary-button add-button" onClick={add}>{initialItem ? "Update item" : "Add to order"} · {money(unitPrice * config.quantity)}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function OptionGroup({ label, values, selected, suffix, allowDeselect, onSelect }: { label: string; values: string[]; selected: string; suffix?: Record<string, string>; allowDeselect?: boolean; onSelect: (value: string) => void }) {
  return (
    <fieldset className="option-group">
      <legend>{label}</legend>
      <div>
        {values.map((value) => {
          const isSelected = selected === value;
          return (
            <button
              type="button"
              key={value}
              className={isSelected ? "selected" : ""}
              onClick={() => onSelect(allowDeselect && isSelected ? "None" : value)}
              aria-pressed={isSelected}
            >
              {value} {suffix?.[value] && <small>{suffix[value]}</small>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PriceTicker({ targetPrice }: { targetPrice: number }) {
  const [displayPrice, setDisplayPrice] = useState<string>(money(targetPrice));

  useEffect(() => {
    const finalFormatted = money(targetPrice);
    const startTime = performance.now();
    const duration = 380;

    let animId: number;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < duration) {
        const randomDollars = Math.floor(Math.random() * 6) + 3;
        const randomCents = [0, 25, 50, 75, 95][Math.floor(Math.random() * 5)];
        setDisplayPrice(`$${randomDollars}.${randomCents < 10 ? "0" : ""}${randomCents}`);
        animId = requestAnimationFrame(animate);
      } else {
        setDisplayPrice(finalFormatted);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [targetPrice]);

  return <span className="price-ticker-num">{displayPrice}</span>;
}

export function Storefront({ page = "home" }: { page?: "home" | "menu" }) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Coffee");
  const [heroProduct, setHeroProduct] = useState(featuredProducts[0]);
  const [menuShowcaseProduct, setMenuShowcaseProduct] = useState<Product>(
    menuProducts.find((p) => p.category === "Coffee") ?? menuProducts[0]
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const justAddedTimer = useRef<number | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [prepTime, setPrepTime] = useState(15);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [scheduling, setScheduling] = useState<SchedulingSettings>({ enabled: true, horizonMinutes: 240, slotMinutes: 15 });
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
          if (typeof data.prepTime === "number") setPrepTime(data.prepTime);
          if (typeof data.paused === "boolean") setOrdersPaused(data.paused);
          if (data.scheduling) setScheduling(data.scheduling);
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

  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const isModalOpen = Boolean(selectedProduct || cartOpen || checkoutOpen || confirmation || activeVideoModal);

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add("modal-open");
      (window as any).__lenis?.stop();
    } else {
      document.body.classList.remove("modal-open");
      (window as any).__lenis?.start();
    }
    return () => {
      document.body.classList.remove("modal-open");
      (window as any).__lenis?.start();
    };
  }, [isModalOpen]);

  function openProduct(product: Product) {
    if (availability[product.id] === false) return;
    setInteractionStarted(true);
    setMenuShowcaseProduct(product);
    setSelectedProduct(product);
  }

  function quickAdd(product: Product) {
    setCart((current) => [...current, {
      key: `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      options: [],
      prepStation: prepStationFor(product),
    }]);
    setJustAdded(product.id);
    window.clearTimeout(justAddedTimer.current);
    justAddedTimer.current = window.setTimeout(() => setJustAdded(null), 1100);
  }

  function handleEditCartItem(item: CartItem) {
    const prod = menuProducts.find((p) => p.id === item.id);
    if (prod) {
      setEditingCartItem(item);
      setSelectedProduct(prod);
      setCartOpen(false);
    }
  }

  function handleSaveConfiguredItem(item: CartItem) {
    if (editingCartItem) {
      setCart((current) =>
        current.map((c) => (c.key === editingCartItem.key ? item : c))
      );
      setEditingCartItem(null);
    } else {
      setCart((current) => [...current, item]);
    }
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function scrollToCategory(category: MenuCategory) {
    const target = document.getElementById(categoryId(category));
    if (!target) return;
    const nav = document.querySelector(".standalone-order .category-nav-wrap");
    const navHeight = nav ? nav.getBoundingClientRect().height : 46;
    const y = window.scrollY + target.getBoundingClientRect().top - (84 + navHeight + 8);
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setActiveCategory(category);
    const first = menuProducts.find((p) => p.category === category);
    if (first) setMenuShowcaseProduct(first);
  }

  function renderRow(product: Product) {
    const soldOut = availability[product.id] === false;
    const isSelected = menuShowcaseProduct.id === product.id;
    return (
      <div className="menu-item-row-wrap" key={product.id}>
        <button
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
          <div className="item-price-wrap">
            <span className="item-price">{soldOut ? "Sold out" : priceLabel(product)}</span>
          </div>
        </button>
        {!soldOut && (
          <button
            type="button"
            className={`item-quick-add ${justAdded === product.id ? "added" : ""}`}
            onClick={() => product.configurable ? openProduct(product) : quickAdd(product)}
            aria-label={`${product.configurable ? "Customize" : "Add"} ${product.name}`}
            title={`${product.configurable ? "Customize" : "Add"} ${product.name}`}
          >
            <span className="universal-cart-glyph" aria-hidden="true" />
            <span className="quick-add-plus" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  useEffect(() => {
    if (!isMenuPage) return;
    const blocks = categories
      .map((c) => document.getElementById(categoryId(c)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!blocks.length) return;
    const onScroll = () => {
      /* the section whose header is closest to just under the sticky nav wins */
      let best = blocks[0];
      let bestDist = Infinity;
      for (const el of blocks) {
        const d = Math.abs(el.getBoundingClientRect().top - 150);
        if (d < bestDist) { bestDist = d; best = el; }
      }
      const match = categories.find((c) => categoryId(c) === best.id);
      if (match) setActiveCategory((prev) => (prev === match ? prev : match));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuPage]);

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
            <img src="/cart-icon-white.png" className="cart-glyph" alt="" aria-hidden="true" />
            <span>{cartCount}</span>
          </button>
        }
      />

      {!isMenuPage && <ScrollHero scrollHeights={3}>
        <section className="hero" id="top">
          <div className="hero-copy">
            <span className="eyebrow">Roasted in Union, New Jersey</span>
            <h1><span>Coffee from</span><span>El Salvador,</span><em>Roasted in Union</em></h1>
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
            <div key={heroProduct.id} className="hero-visual-container hero-visual-swipe">
              {heroProduct.video ? (
                <div className="hero-featured-video-wrap">
                  <video
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
            </div>
            <div className="hero-product-caption">
              <div key={heroProduct.id} className="hero-product-text hero-text-swipe">
                <span>{heroProduct.category}</span>
                <strong>{heroProduct.name}</strong>
              </div>
              <button className="hero-add-btn" onClick={() => openProduct(heroProduct)}>
                <span>Add to cart · <PriceTicker targetPrice={heroProduct.price} /></span>
                <span className="btn-cart-glyph" />
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
        <div className="order-section-badge-wrap" aria-hidden="true">
          <img src="/deafshark-logo.png" alt="Deaf Shark Coffee" className="order-section-badge" />
        </div>
        <div className="menu-showcase-grid">
          {/* Left Column: Title + Clean Product Card + Brand Tag (Sticky) */}
          <aside className="menu-product-card-wrap">
            <div className="menu-sidebar-heading">
              <h2>{isMenuPage ? "The Full Deaf Shark Menu" : "Salvadoran roasts, poured ice-cold."}</h2>
            </div>
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
            {isMenuPage && (
              <div className="category-nav-wrap">
                <div className="category-nav" role="tablist" aria-label="Menu categories">
                  {categories.map((category) => (
                    <button
                      key={category}
                      role="tab"
                      aria-selected={activeCategory === category}
                      className={activeCategory === category ? "active" : ""}
                      onClick={() => scrollToCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/*
              The menu page shows every category at once. The buttons jump to a
              section rather than filtering it, so nothing is hidden behind a click.
              Each section header pins while its own items pass under it and is then
              pushed off by the next header, which is plain sticky behaviour.
            */}
            {isMenuPage ? (
              categories.map((category) => {
                const items = menuProducts.filter((p) => p.category === category);
                if (!items.length) return null;
                return (
                  <section className="menu-category-block" key={category} id={categoryId(category)}>
                    <div className="menu-panel-header">
                      <div>
                        <h3>{category}</h3>
                      </div>
                      {DRINK_CATEGORIES.includes(category) && (
                        <span className="menu-milk-note">Whole, skim, oat, almond, or half and half · no extra charge</span>
                      )}
                    </div>
                    <div className="menu-items-list">{items.map(renderRow)}</div>
                  </section>
                );
              })
            ) : (
              <section className="menu-category-block">
                <div className="menu-panel-header">
                  <div>
                    <h3>Our Refreshments</h3>
                  </div>
                  <span className="menu-milk-note">Whole, skim, oat, almond, or half and half · no extra charge</span>
                </div>
                <div className="menu-items-list">
                  {menuProducts.filter((p) => p.category === "Coffee" || p.category === "Non-Coffee").map(renderRow)}
                </div>
                <div className="menu-bottom-actions">
                  <a href="/menu" className="primary-button hero-cta-btn menu-full-button">
                    <span>View our full menu</span>
                    <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {!isMenuPage && <section className="take-home-section">
        <div className="take-home-image">
          <img src="/ocean-blend-bags.jpg" alt="Deaf Shark Ocean Blend coffee bags displayed in the Union shop" />
        </div>
        <div className="take-home-copy">
          <div className="take-home-body">
            <h2>Take Our Roast Home</h2>
            <p>A 12 oz bag of medium roast whole bean coffee from El Salvador, roasted in Union and ready for your home setup.</p>
            <ul className="take-home-features">
              <li><span className="take-home-num">-</span> Ocean Blend</li>
              <li><span className="take-home-num">-</span> Medium roast</li>
              <li><span className="take-home-num">-</span> Whole bean</li>
              <li><span className="take-home-num">-</span> 12 oz bag</li>
            </ul>
          </div>
          <button className="primary-button take-home-btn" onClick={() => openProduct(oceanBlend)}>
            <span>Order a bag · {money(oceanBlend.price)}</span>
            <span className="btn-cart-glyph" />
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
          <h2>A cup with a place behind it.<br />One farm, one variety.</h2>
          <p>Our featured coffee comes from single-origin harvests in El Salvador. Red Bourbon beans are washed, roasted with care, and served here in Union.</p>
          <dl>
            <div><dt>Origin</dt><dd>El Salvador</dd></div>
            <div><dt>Variety</dt><dd>Red Bourbon</dd></div>
            <div><dt>Process</dt><dd>Washed</dd></div>
            <div><dt>Roast</dt><dd>Medium</dd></div>
          </dl>
        </div>
      </section>}

      {!isMenuPage && (
        <section className="visit-section" id="visit">
          <div className="visit-header-block">
            <div className="visit-title-wrap">
              <h2>Deaf Shark Coffee<br />Union, New Jersey</h2>
              <img src="/deafshark-logo.png" alt="Deaf Shark Coffee" className="visit-brand-stamp" />
            </div>
            <div className="visit-cards-row">
              <div className="visit-card">
                <span className="visit-card-label">Address</span>
                <strong>900 Green Lane</strong>
                <span>Union, NJ 07083</span>
                <a href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">Get directions</a>
              </div>
              <div className="visit-card">
                <span className="visit-card-label">August Hours</span>
                <strong>5:00 AM – 5:00 PM</strong>
                <span>7 days a week for August</span>
                <a href="/menu">Order ahead</a>
              </div>
              <div className="visit-card">
                <span className="visit-card-label">Contact</span>
                <strong>(908) 481-8884</strong>
                <span>Call ahead or stop in</span>
                <a href="tel:+19084818884">Call shop</a>
              </div>
            </div>
          </div>
          <div className="visit-map-container">
            <iframe
              title="Deaf Shark Coffee Map Location"
              src="https://maps.google.com/maps?q=Deaf+Shark+Coffee,+900+Green+Lane,+Union,+NJ+07083&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="visit-map-frame"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Deaf+Shark+Coffee+900+Green+Lane+Union+NJ+07083"
              target="_blank"
              rel="noopener noreferrer"
              className="map-location-banner"
            >
              <div className="map-banner-logo-wrap">
                <img src="/deafshark-logo.png" alt="Deaf Shark Coffee" className="map-banner-logo" />
              </div>
              <div className="map-banner-info">
                <strong>Deaf Shark Coffee</strong>
                <span>900 Green Lane, Union, NJ 07083</span>
              </div>
              <div className="map-banner-nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.5 2.5L2 9.5l8 4 4 8 7.5-19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>
          </div>
        </section>
      )}

      <SiteFooter />

      <button className={`mobile-cart ${cartCount ? "visible" : ""}`} onClick={() => setCartOpen(true)}>
        <span>{cartCount} {cartCount === 1 ? "item" : "items"}</span><strong>View cart · {money(subtotal)}</strong>
      </button>

      {selectedProduct && (
        <ProductConfigurator
          product={selectedProduct}
          initialItem={editingCartItem || undefined}
          onClose={() => {
            setSelectedProduct(null);
            if (editingCartItem) {
              setEditingCartItem(null);
              setCartOpen(true);
            }
          }}
          onAdd={handleSaveConfiguredItem}
        />
      )}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          subtotal={subtotal}
          onClose={() => setCartOpen(false)}
          onEdit={handleEditCartItem}
          onRemove={(key) => setCart((current) => current.filter((item) => item.key !== key))}
          onCheckout={() => {
            if (ordersPaused) return;
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          ordersPaused={ordersPaused}
        />
      )}
      {checkoutOpen && (
        <Checkout prepTime={prepTime} scheduling={scheduling} ordersPaused={ordersPaused} cart={cart} subtotal={subtotal} onClose={() => setCheckoutOpen(false)} onComplete={(number, eta, phone) => { rememberOrder({ orderNumber: number, phone }); setCheckoutOpen(false); setCart([]); setConfirmation({ number, eta }); }} />
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section className="confirmation-card" role="dialog" aria-modal="true">
            <img src="/deafshark-dog-art.png" alt="Deaf Shark character" />
            <span className="eyebrow">Order received</span>
            <h2>We have it, {confirmation.number}.</h2>
            <p>Your pickup estimate is <strong>{confirmation.eta}</strong>. We will text you once when it is ready for pickup.</p>
            <div className="confirmation-actions"><button className="primary-button" onClick={() => { setConfirmation(null); window.dispatchEvent(new Event("deaf-shark-open-order")); }}>View order status</button><button className="soft-button" onClick={() => setConfirmation(null)}>Back to the menu</button></div>
          </section>
        </div>
      )}

      {activeVideoModal && (
        <CustomVideoModal
          product={activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
          onOrder={(product) => openProduct(product)}
        />
      )}
    </main>
  );
}

function CustomVideoModal({
  product,
  onClose,
  onOrder,
}: {
  product: Product;
  onClose: () => void;
  onOrder: (p: Product) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const seekTo = (parseFloat(e.target.value) / 100) * video.duration;
    video.currentTime = seekTo;
    setProgress(parseFloat(e.target.value));
  };

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      className="video-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} video presentation`}
    >
      <div className="video-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="video-modal-close"
          onClick={onClose}
          aria-label="Close video preview"
        >
          ✕
        </button>

        <div className="custom-video-container">
          <video
            ref={videoRef}
            src={product.video}
            autoPlay
            playsInline
            className="video-modal-player"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
          />

          <div className="custom-video-controls">
            <div className="video-scrubber-wrap">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress || 0}
                onChange={handleSeek}
                className="video-progress-bar"
                aria-label="Video timeline progress"
              />
            </div>

            <div className="video-controls-bottom">
              <div className="video-controls-left">
                <button
                  type="button"
                  className="video-ctrl-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <polygon points="6,4 20,12 6,20" />
                    </svg>
                  )}
                </button>

                <span className="video-time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="video-controls-right">
                <div
                  className="video-volume-group"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <div className={`vertical-volume-popup ${showVolumeSlider ? "visible" : ""}`}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="vertical-volume-range"
                      aria-label="Volume level"
                    />
                    <span className="vertical-volume-pct">
                      {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="video-ctrl-btn volume-btn"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    title={isMuted ? "Unmute (Click to toggle sound)" : "Mute (Click to toggle sound)"}
                  >
                    {isMuted || volume === 0 ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="video-modal-caption">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, subtotal, ordersPaused, onClose, onEdit, onRemove, onCheckout }: { cart: CartItem[]; subtotal: number; ordersPaused: boolean; onClose: () => void; onEdit: (item: CartItem) => void; onRemove: (key: string) => void; onCheckout: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="cart-drawer" data-lenis-prevent onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><h2>Your cart</h2></div><button onClick={onClose} aria-label="Close cart">×</button></div>
        <div className="cart-items">
          {cart.length === 0 && <div className="empty-cart"><img src="/favicon.png" alt="" /><h3>Your cart is ready when you are.</h3><p>Choose a drink, breakfast, sandwich, or bite from the menu.</p></div>}
          {cart.map((item) => (
            <article key={item.key} className="cart-item">
              <span>{item.quantity}</span>
              <div>
                <strong>{item.name}</strong>
                {item.options.length > 0 && <small>{item.options.join(" · ")}</small>}
                <div className="cart-item-actions">
                  <button type="button" className="cart-edit-btn" onClick={() => onEdit(item)}>Edit</button>
                  <span className="cart-action-sep">·</span>
                  <button type="button" className="cart-remove-btn" onClick={() => onRemove(item.key)}>Remove</button>
                </div>
              </div>
              <strong>{money(item.unitPrice * item.quantity)}</strong>
            </article>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small><em>Taxes are calculated at checkout.</em></small>{ordersPaused && <p className="form-error">Online ordering is temporarily paused. Your cart will stay here.</p>}<button className="primary-button" disabled={ordersPaused} onClick={onCheckout}>{ordersPaused ? "Online ordering paused" : "Continue to checkout"}</button></div>}
      </aside>
    </div>
  );
}

function Checkout({ cart, subtotal, prepTime = 15, scheduling, ordersPaused, onClose, onComplete }: { cart: CartItem[]; subtotal: number; prepTime?: number; scheduling: SchedulingSettings; ordersPaused: boolean; onClose: () => void; onComplete: (number: string, eta: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<"pickup" | "card">("pickup");
  const [fulfillmentType, setFulfillmentType] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; scheduledFor?: string }>({});
  const [scheduleAnchor] = useState(() => Date.now());
  const tax = subtotal * 0.06625;

  function localInputValue(date: Date) {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  const firstScheduledDate = new Date(Math.ceil((scheduleAnchor + prepTime * 60_000) / (scheduling.slotMinutes * 60_000)) * scheduling.slotMinutes * 60_000);
  const lastScheduledDate = new Date(scheduleAnchor + scheduling.horizonMinutes * 60_000);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const nextFieldErrors: { name?: string; phone?: string; scheduledFor?: string } = {};
    if (!name.trim()) nextFieldErrors.name = "Enter the name we should put on the order.";
    if (phone.replace(/\D/g, "").length !== 10) nextFieldErrors.phone = "Enter a complete 10-digit mobile number.";
    if (fulfillmentType === "scheduled" && !scheduledFor) nextFieldErrors.scheduledFor = "Choose your pickup date and time.";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    if (ordersPaused) {
      setError("Online ordering is temporarily paused. Please order at the counter.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          paymentMethod: payment,
          fulfillmentType,
          scheduledFor: fulfillmentType === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
          items: cart,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to place order");
      onComplete(data.order.orderNumber, data.order.pickupEta, phone);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place order");
    } finally {
      setSubmitting(false);
    }
  }

  function formatPhoneInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (!digits) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="checkout-card" data-lenis-prevent onSubmit={submit} noValidate onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close checkout">×</button>
        <h2>Finish your order</h2>
        <label className={fieldErrors.name ? "has-error" : undefined}><span>Name for the order</span><input value={name} onChange={(event) => { setName(event.target.value); if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined })); }} placeholder="Your name" aria-invalid={fieldErrors.name ? true : undefined} aria-describedby={fieldErrors.name ? "checkout-name-error" : undefined} />{fieldErrors.name && <small className="checkout-field-error" id="checkout-name-error" role="alert"><i aria-hidden="true">!</i>{fieldErrors.name}</small>}</label>
        <label className={fieldErrors.phone ? "has-error" : undefined}><span>Mobile number</span><input type="tel" value={phone} onChange={(event) => { setPhone(formatPhoneInput(event.target.value)); if (fieldErrors.phone) setFieldErrors((current) => ({ ...current, phone: undefined })); }} placeholder="(908)-555-0123" maxLength={14} aria-invalid={fieldErrors.phone ? true : undefined} aria-describedby={fieldErrors.phone ? "checkout-phone-error checkout-phone-note" : "checkout-phone-note"} />{fieldErrors.phone && <small className="checkout-field-error" id="checkout-phone-error" role="alert"><i aria-hidden="true">!</i>{fieldErrors.phone}</small>}<small className="field-note" id="checkout-phone-note">We send one text when your order is ready. That is the only message you will get.</small></label>
        <fieldset className="payment-options pickup-options">
          <legend>Pickup time</legend>
          <label><input type="radio" name="fulfillment" checked={fulfillmentType === "asap"} onChange={() => setFulfillmentType("asap")} /><span><strong>As soon as possible</strong><small>Estimated in about {prepTime} minutes</small></span></label>
          {scheduling.enabled && <label><input type="radio" name="fulfillment" checked={fulfillmentType === "scheduled"} onChange={() => { setFulfillmentType("scheduled"); setPayment("card"); if (!scheduledFor) setScheduledFor(localInputValue(firstScheduledDate)); }} /><span><strong>Schedule pickup</strong><small>Choose a time within the next few hours</small></span></label>}
        </fieldset>
        {fulfillmentType === "scheduled" && <label className={fieldErrors.scheduledFor ? "has-error" : undefined}><span>Scheduled pickup</span><input type="datetime-local" value={scheduledFor} min={localInputValue(firstScheduledDate)} max={localInputValue(lastScheduledDate)} step={scheduling.slotMinutes * 60} onChange={(event) => { setScheduledFor(event.target.value); if (fieldErrors.scheduledFor) setFieldErrors((current) => ({ ...current, scheduledFor: undefined })); }} aria-invalid={fieldErrors.scheduledFor ? true : undefined} aria-describedby={fieldErrors.scheduledFor ? "checkout-schedule-error" : undefined} />{fieldErrors.scheduledFor && <small className="checkout-field-error" id="checkout-schedule-error" role="alert"><i aria-hidden="true">!</i>{fieldErrors.scheduledFor}</small>}<small className="field-note">Scheduled orders require advance online payment.</small></label>}
        <fieldset className="payment-options">
          <legend>Payment</legend>
          <label><input type="radio" name="payment" disabled={fulfillmentType === "scheduled"} checked={payment === "pickup"} onChange={() => setPayment("pickup")} /><span><strong>Pay at pickup</strong><small>{fulfillmentType === "scheduled" ? "Not available for scheduled orders" : "Pay at the counter when you arrive"}</small></span></label>
          <label><input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} /><span><strong>Card payment demo</strong><small>Production payment provider to be confirmed</small></span></label>
        </fieldset>
        <div className="checkout-total">
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div><span>Estimated tax</span><strong>{money(tax)}</strong></div>
          <div><span>Total</span><strong>{money(subtotal + tax)}</strong></div>
        </div>
        <div className="checkout-pickup-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{fulfillmentType === "scheduled" ? <>Pickup at <strong>{scheduledFor ? new Date(scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "your selected time"}</strong></> : <>Estimated pickup in <strong>about {prepTime} minutes</strong></>}</span>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={submitting || ordersPaused}>{submitting ? "Sending order..." : ordersPaused ? "Online ordering paused" : `Place pickup order · ${money(subtotal + tax)}`}</button>
      </form>
    </div>
  );
}
