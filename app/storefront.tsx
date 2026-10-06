"use client";

import { type CSSProperties, type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { StoreHours } from "./store-hours";
import { PauseNotice } from "./pause-notice";
import { pointsForSubtotal } from "../lib/loyalty";
import ScrollHero from "./scroll-hero";
import {
  categories,
  applyMenuContentOverride,
  defaultSizeForProduct,
  defaultTemperatureForProduct,
  DRINK_CATEGORIES,
  EXTRA_SHOT_PRICE,
  MAX_EXTRA_SHOTS,
  featuredProducts,
  hasExtraShotOptionsForProduct,
  hasMilkOptionsForProduct,
  hasSyrupOptionsForProduct,
  menuProducts,
  MILK_OPTIONS,
  ingredientForOption,
  ingredientKey,
  modifierGroupsForProduct,
  NO_INGREDIENTS_OUT,
  outIngredientsFrom,
  prepStationFor,
  priceProductSelection,
  SYRUP_OPTIONS,
  SYRUP_PRICE,
  type ModifierGroup,
  type MenuCategory,
  type MenuContentOverride,
  type PrepStation,
  type Product,
  type ProductSelection,
} from "./menu-data";
import { CustomerHeader, SiteFooter } from "./site-chrome";
import { OrderOnlineLink } from "./order-online-link";
import { CUSTOM_CHECKOUT_ENABLED, ORDER_READY_SMS_ENABLED } from "./ordering";
import TurnstileWidget from "./turnstile-widget";
import { formatPhoneInput } from "../lib/phone-format";
import "./drink-visuals.css";
import { MenuPreviewPhoto, menuPreviewSrc, warmMenuPhoto } from "./menu-preview-photo";
import { recommendCartAddOns } from "./cart-recommendations";

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

type CartFlight = {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

/* Lines with the same product and the same choices are one line with a quantity,
   so adding the same water five times shows "5" once instead of five rows. */
function cartLineSignature(item: CartItem) {
  return JSON.stringify([item.id, item.unitPrice, item.options, item.selection ?? null]);
}

function mergeCartLines(items: CartItem[]): CartItem[] {
  const merged: CartItem[] = [];
  for (const item of items) {
    const match = merged.find((line) => cartLineSignature(line) === cartLineSignature(item));
    if (match) match.quantity += item.quantity;
    else merged.push({ ...item });
  }
  return merged;
}

/* Match the stacked menu layouts, including portrait tablets. Touch-only
   screens also need a preview tap because they cannot hover. */
function usesMenuTapPreview() {
  return window.matchMedia("(max-width: 960px), (orientation: portrait), (hover: none)").matches;
}

/* Read the rendered sticky stack so category jumps also work after rotation. */
function pinnedMenuBottom() {
  const pin = document.querySelector<HTMLElement>(".standalone-order .menu-product-pin");
  if (!pin || getComputedStyle(pin).position !== "sticky") return null;
  return (parseFloat(getComputedStyle(pin).top) || 0) + pin.getBoundingClientRect().height + 12;
}

/* Shape returned by /api/site-content for the home page featured carousel. */
type FeaturedSlideResponse = {
  productId: string;
  categoryLabel: string;
  title: string;
  buttonLabel: string;
  priceCents: number;
  mediaUrl: string;
};

type SchedulingSettings = {
  enabled: boolean;
  horizonMinutes: number;
  slotMinutes: number;
};

type FeaturedProduct = Product & { featuredButtonLabel?: string; featuredCategoryLabel?: string };

function LazyAutoplayVideo({
  src,
  poster,
  ariaLabel,
}: {
  src: string;
  poster: string;
  ariaLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    video.load();
    video.play().catch(() => {});
  }, [shouldLoad]);

  return (
    <video
      ref={videoRef}
      autoPlay={shouldLoad}
      muted
      loop
      playsInline
      preload={shouldLoad ? "metadata" : "none"}
      poster={poster}
      aria-label={ariaLabel}
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  );
}

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

/* Extra espresso shots per drink, the same cap the server enforces. */
const MAX_SHOTS = MAX_EXTRA_SHOTS;

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

const categoryId = (category: string) => "menu-cat-" + category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const categoryLabel = (category: string) =>
  category === "From the Fridge" ? "Grab & Go" : category;

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

function productPhoto(product: Product) {
  return product.photo || ((product.visual === "hot" || product.visual === "iced") ? CUP_PHOTOS[product.visual] : (product.visual === "sandwich" || product.category === "Sandwiches" || product.category === "Breakfast" ? "/chicken-pesto-centered.jpg" : undefined));
}

function ProductVisual({ product, compact = false, menuPreview = false }: { product: Product; compact?: boolean; menuPreview?: boolean }) {
  const isCup = product.visual === "hot" || product.visual === "iced";
  const isDrinkProduct = DRINK_CATEGORIES.includes(product.category);
  const isPackagedProduct = product.category === "From the Fridge" || product.category === "Coffee Beans";
  const isFoodProduct = product.category === "Breakfast" || product.category === "Sandwiches" || product.category === "Bites" || product.category === "Desserts";
  if (product.imageComingSoon) {
    return (
      <div className={`product-visual product-${product.visual} product-image-coming-soon ${isFoodProduct ? "product-food" : ""} ${compact ? "product-visual-compact" : ""}`}>
        <strong>Image coming soon!</strong>
      </div>
    );
  }
  const photo = productPhoto(product);
  if (photo) {
    return (
      <div className={`product-visual product-${product.visual} ${isDrinkProduct ? "product-drink" : ""} ${isPackagedProduct ? "product-packaged" : ""} ${isFoodProduct ? "product-food" : ""} ${compact ? "product-visual-compact" : ""}`}>
        <div className="visual-glow" />
        {menuPreview
          ? <MenuPreviewPhoto key={menuPreviewSrc(photo)} src={menuPreviewSrc(photo)} alt={product.name} />
          : <img key={photo} className="product-photo" src={photo} alt={product.name} />}
        <span className="visual-shadow" />
      </div>
    );
  }
  return (
    <div className={`product-visual product-${product.visual} ${isDrinkProduct ? "product-drink" : ""} ${isFoodProduct ? "product-food" : ""} ${compact ? "product-visual-compact" : ""}`}>
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
        <img className="coffee-bag-photo" src="/ocean-blend-bags-900.webp" alt="Deaf Shark Ocean Blend medium roast coffee bags" decoding="async" />
      )}
      <span className="visual-shadow" />
    </div>
  );
}

/* Online orders allow up to 20 of any one menu item, counted across every cart
   line for it. The server enforces the same limit in lib/order-intake.ts. */
const MAX_PER_ITEM = 20;

function quantityInCart(cart: CartItem[], productId: string, excludeKey?: string) {
  return cart.reduce((sum, item) => (item.id === productId && item.key !== excludeKey ? sum + item.quantity : sum), 0);
}

function ProductConfigurator({
  product,
  initialItem,
  maxQuantity = MAX_PER_ITEM,
  onClose,
  onAdd,
  outIngredients = NO_INGREDIENTS_OUT,
  pause,
}: {
  product: Product;
  initialItem?: CartItem;
  /** Ingredient keys the shop marked out today. */
  outIngredients?: ReadonlySet<string>;
  /** While online ordering is paused the item can still go in the cart. */
  pause?: { paused: boolean; until: number | null; onEnd: () => void };
  /** How many more of this item the cart can take. */
  maxQuantity?: number;
  onClose: () => void;
  onAdd: (item: CartItem, source?: HTMLElement | null) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /* The ingredient behind a choice, when the shop marked it out today. */
  const outFor = (label: string) => {
    const ingredient = ingredientForOption(label);
    return ingredient && outIngredients.has(ingredientKey(ingredient.name)) ? ingredient : null;
  };
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isFood = ["Breakfast", "Sandwiches", "Bites", "Desserts"].includes(product.category);
  const isSmoothie = !!product.bases?.length;
  const hasMilkOptions = hasMilkOptionsForProduct(product);
  const availableTemps = temperaturesFor(product);
  const hasTempOptions = isDrink && availableTemps.length > 1;
  const isHotOnlyDrink = isDrink && availableTemps.length === 1 && availableTemps[0] === "Hot";
  const hasSyrupOptions = hasSyrupOptionsForProduct(product);
  const hasShotOptions = hasExtraShotOptionsForProduct(product);
  const hasFlavorOptions = !!product.flavors?.length;
  /* Every group the product could ever have. Used to seed and to parse an
     existing cart item, so a saved ice choice survives a temperature toggle. */
  const modifierGroups: ModifierGroup[] = modifierGroupsForProduct(product);

  const defaultMilk: MilkChoice = ["americano", "drip-coffee", "espresso", "cold-brew", "chicha", "malta", "dirty-soda", "red-eye", "decaf-coffee", "regular-coffee"].includes(product.id) ? "None" : "Whole";
  const defaultTemp = defaultTemperatureForProduct(product);

  const [config, setConfig] = useState<Configuration>(() => {
    if (!initialItem) {
      return {
        temperature: defaultTemp,
        size: defaultSizeForProduct(product, defaultTemp) || "Regular",
        milk: defaultMilk,
        flavor: product.flavors?.[0] ?? "",
        base: product.bases?.[0] ?? "",
        extraShot: 0,
        syrups: [],
        modifiers: Object.fromEntries(
          modifierGroups.map((group) => {
            const first = group.options.find((option) => !outFor(option.label)) ?? group.options[0];
            return [group.label, group.required && first ? [first.label] : []];
          }),
        ),
        notes: "",
        quantity: 1,
        ...(defaultMilk !== "None" && outFor(defaultMilk)
          ? { milk: (MILK_OPTIONS.find((option) => !outFor(option)) ?? defaultMilk) as MilkChoice }
          : {}),
        ...(product.flavors?.[0] && outFor(product.flavors[0]) && product.category !== "Coffee Beans"
          ? { flavor: product.flavors.find((option) => !outFor(option)) ?? product.flavors[0] }
          : {}),
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
      extraShot = Math.min(MAX_EXTRA_SHOTS, match ? parseInt(match[1], 10) : 1);
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
  const hasTwoSizes = false;
  const drinkSizes = sizesFor(product, config.temperature);
  /* Only the groups that apply to the temperature on screen. A hot drink has no
     ice level, so the group is hidden rather than sent to the barista as noise.
     `priceProductSelection` applies the same rule server-side. */
  const visibleModifierGroups: ModifierGroup[] = modifierGroupsForProduct(product, config.temperature);

  /* An item being edited can still hold a choice that ran out since it was
     added. Price it without the check so the screen renders, and block the
     save with a message instead. */
  let outMessage = "";
  let pricedSelection: ReturnType<typeof priceProductSelection>;
  try {
    pricedSelection = priceProductSelection(product, config, outIngredients);
  } catch (error) {
    outMessage = error instanceof Error ? error.message : "One of these choices is not available today.";
    pricedSelection = priceProductSelection(product, config);
  }
  const unitPrice = pricedSelection.unitPrice;
  const selectedModifierPhoto = visibleModifierGroups
    .flatMap((group) => config.modifiers?.[group.label] ?? [])
    .map((value) => product.modifierPhotos?.[value])
    .find((photo): photo is string => Boolean(photo));
  const selectedProductPhoto = selectedModifierPhoto ?? product.flavorPhotos?.[config.flavor] ?? product.photo;
  const selectedTemperaturePhoto = product.temperaturePhotos?.[config.temperature];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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

  function add(event: MouseEvent<HTMLButtonElement>) {
    if (maxQuantity < 1 || outMessage) return;
    onAdd({
      key: initialItem?.key ?? `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      quantity: Math.min(config.quantity, maxQuantity),
      unitPrice,
      options: pricedSelection.options,
      prepStation: prepStationFor(product),
      selection: pricedSelection.selection,
    }, event.currentTarget);
  }

  return (
    <div className="modal-backdrop">
      <section
        className="configurator"
        data-layout={isHotOnlyDrink ? "hot-only-drink" : isFood ? "food" : undefined}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${product.name}`}
      >
        <button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="Close product configurator">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
        </button>
        <div className="config-product">
          <ProductVisual
            product={{
              ...product,
              visual: isDrink ? (config.temperature === "Hot" ? "hot" : "iced") : product.visual,
              photo: isDrink
                ? (selectedTemperaturePhoto ?? (config.temperature === "Hot" ? "/cup-hot.png" : (selectedProductPhoto || "/drink-iced-latte.webp")))
                : (selectedProductPhoto || (!product.imageComingSoon && (product.visual === "sandwich" || product.category === "Breakfast" || product.category === "Sandwiches") ? "/chicken-pesto-centered.jpg" : undefined)),
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
              isOut={product.category === "Coffee Beans" ? undefined : (value) => Boolean(outFor(value))}
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
              onSelect={(value) => setConfig({ ...config, base: value, milk: value === "Milk" && config.milk === "None" ? "Whole" : config.milk })}
            />
          )}
          {/* Only when blended with milk: a water smoothie has no milk to choose. */}
          {isSmoothie && config.base === "Milk" && (
            <OptionGroup
              label="Milk"
              values={MILK_OPTIONS as unknown as string[]}
              selected={config.milk === "None" ? "Whole" : config.milk}
              isOut={(value) => Boolean(outFor(value))}
              onSelect={(value) => setConfig({ ...config, milk: value as MilkChoice })}
            />
          )}
          {hasMilkOptions && (
            <OptionGroup
              label="Milk"
              /* "No milk" leads so the choice is explicit. It was previously only
                 reachable by clicking the selected option to deselect it, which
                 left black coffees showing no selection at all. */
              values={["None", ...MILK_OPTIONS] as unknown as string[]}
              labels={{ None: "No milk" }}
              selected={config.milk}
              isOut={(value) => value !== "None" && Boolean(outFor(value))}
              onSelect={(value) => setConfig({ ...config, milk: value as MilkChoice })}
            />
          )}
          {hasSyrupOptions && (
            <fieldset className="option-group">
              <legend>Extra flavor syrups</legend>
              <div className="syrup-grid">
                {SYRUP_OPTIONS.map((flavor) => {
                  const isSelected = config.syrups.includes(flavor);
                  const out = Boolean(outFor(flavor));
                  return (
                    <button
                      type="button"
                      key={flavor}
                      disabled={out && !isSelected}
                      className={`syrup-pill ${isSelected ? "selected" : ""} ${out ? "is-out" : ""}`}
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
                      <small>{out ? "Out today" : `+${money(SYRUP_PRICE)}`}</small>
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
          {visibleModifierGroups.map((group) => {
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
                  isOut={(value) => Boolean(outFor(value))}
                  onSelect={(value) => setConfig({
                    ...config,
                    modifiers: { ...config.modifiers, [group.label]: value === "None" ? [] : [value] },
                  })}
                />
              );
            }
            return (
              <fieldset className={`option-group ${group.label === "Remove ingredients" ? "removal-option-group" : ""}`} key={group.label}>
                <legend>{group.label}</legend>
                <div className="syrup-grid">
                  {group.options.map((option) => {
                    const out = outFor(option.label);
                    /* A removal whose ingredient is out is applied for the customer. */
                    const madeWithout = Boolean(out?.removal);
                    const isSelected = madeWithout || selected.includes(option.label);
                    return (
                      <button
                        type="button"
                        key={option.label}
                        disabled={Boolean(out) && (madeWithout || !isSelected)}
                        className={`syrup-pill ${isSelected ? "selected" : ""} ${out ? "is-out" : ""}`}
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
                        {out ? <small>{madeWithout ? "Out today, made without" : "Out today"}</small> : option.price ? <small>+{money(option.price)}</small> : null}
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
          {outMessage && <p className="config-out-message" role="alert">{outMessage}</p>}
          {pause?.paused && <PauseNotice until={pause.until} onEnd={pause.onEnd} />}
          <div className="add-row">
            <div className="quantity-control" aria-label="Quantity">
              <button onClick={() => setConfig({ ...config, quantity: Math.max(1, config.quantity - 1) })} aria-label="Decrease quantity">−</button>
              <strong>{Math.min(config.quantity, Math.max(maxQuantity, 1))}</strong>
              <button onClick={() => setConfig({ ...config, quantity: Math.min(Math.max(maxQuantity, 1), config.quantity + 1) })} disabled={config.quantity >= maxQuantity} aria-label="Increase quantity" title={config.quantity >= maxQuantity ? `Limit of ${MAX_PER_ITEM} per item` : undefined}>+</button>
            </div>
            {CUSTOM_CHECKOUT_ENABLED ? (
              <button className="primary-button add-button" onClick={add} disabled={maxQuantity < 1 || Boolean(outMessage)}>{maxQuantity < 1 ? `Limit of ${MAX_PER_ITEM} reached` : <>{initialItem ? "Update item" : "Add to order"} · {money(unitPrice * Math.min(config.quantity, maxQuantity))}</>}</button>
            ) : (
              <OrderOnlineLink className="primary-button add-button" ariaLabel={`Order ${product.name} online`}>
                Order online
              </OrderOnlineLink>
            )}
          </div>
          {!CUSTOM_CHECKOUT_ENABLED && <p className="ordering-handoff-note">Online ordering is coming soon. Call the shop and we will be happy to take your order.</p>}
        </div>
      </section>
    </div>
  );
}

function OptionGroup({ label, values, selected, suffix, labels, allowDeselect, isOut, onSelect }: { label: string; values: string[]; selected: string; suffix?: Record<string, string>; /* Display text for values whose stored form differs, e.g. "None" shown as "No milk". */ labels?: Record<string, string>; allowDeselect?: boolean; /* True for a choice the shop marked out today. */ isOut?: (value: string) => boolean; onSelect: (value: string) => void }) {
  return (
    <fieldset className="option-group">
      <legend>{label}</legend>
      <div>
        {values.map((value) => {
          const isSelected = selected === value;
          const out = Boolean(isOut?.(value));
          return (
            <button
              type="button"
              key={value}
              className={`${isSelected ? "selected" : ""} ${out ? "is-out" : ""}`}
              onClick={() => onSelect(allowDeselect && isSelected ? "None" : value)}
              aria-pressed={isSelected}
              disabled={out && !isSelected}
            >
              {labels?.[value] ?? value} {out ? <small>Out today</small> : suffix?.[value] && <small>{suffix[value]}</small>}
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

function HeroFeaturedVideo({
  product,
  onOpenModal,
}: {
  product: FeaturedProduct;
  onOpenModal: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* The element is keyed on the source, so it remounts and re-fires its own load
     events whenever the video changes. The markup is server rendered, so the
     first clip can finish buffering before React hydrates and the canplay /
     loadeddata listeners attach: check readyState here instead of waiting on an
     event that already fired, or the panel stays an empty brown box. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reveal = () => setIsPlaying(true);
    if (video.readyState >= 2) reveal();

    video.play().then(reveal).catch(() => {
      /* Autoplay can be refused (low power mode, a paused tab). Show the frame
         anyway once there is one to show. */
      if (video.readyState >= 1) reveal();
    });

    const onReady = () => reveal();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    const fallback = window.setTimeout(() => {
      if (video.readyState >= 1) reveal();
    }, 1500);

    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      window.clearTimeout(fallback);
    };
  }, [product.video]);

  return (
    <div className="hero-featured-video-wrap">
      <video
        ref={videoRef}
        key={product.video}
        src={product.video}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        suppressHydrationWarning
        className={`hero-featured-video ${isPlaying ? "is-playing" : "is-loading"}`}
        onLoadStart={() => setIsPlaying(false)}
        onPlaying={() => setIsPlaying(true)}
        onLoadedData={() => setIsPlaying(true)}
        onCanPlay={() => setIsPlaying(true)}
      />
      <button
        type="button"
        className="hero-video-play-btn"
        onClick={onOpenModal}
        aria-label={`Play ${product.name} video with sound`}
        title="Play video with sound"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>
  );
}

export function Storefront({ page = "home" }: { page?: "home" | "menu" }) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>(categories[0]);
  const categoryNavRef = useRef<HTMLDivElement | null>(null);
  const mobileCategoryNavRef = useRef<HTMLDivElement | null>(null);
  const categoryIndicatorRef = useRef<HTMLSpanElement | null>(null);
  /* Whether the desktop category strip can scroll further left or right, which
     switches its arrow buttons on and off. */
  const [categoryStripEdges, setCategoryStripEdges] = useState({ atStart: true, atEnd: true });
  const [products, setProducts] = useState<Product[]>(menuProducts);
  const [featuredSlides, setFeaturedSlides] = useState<FeaturedProduct[]>(featuredProducts);
  const [heroProduct, setHeroProduct] = useState<FeaturedProduct>(featuredProducts[0]);
  const [menuShowcaseSelection, setMenuShowcaseProduct] = useState<Product>(
    menuProducts.find((p) => p.category === categories[0]) ?? menuProducts[0]
  );
  const menuShowcaseProduct = products.find((product) => product.id === menuShowcaseSelection.id) ?? menuShowcaseSelection;
  const menuRowsRef = useRef<HTMLDivElement>(null);
  const menuPointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const root = menuRowsRef.current;
    if (!root) return;
    const byId = new Map(products.map((product) => [product.id, product]));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const product = byId.get((entry.target as HTMLElement).dataset.menuProductId ?? "");
        const photo = product && productPhoto(product);
        if (photo) warmMenuPhoto(photo);
      }
    }, { rootMargin: "800px 0px" });
    root.querySelectorAll("[data-menu-product-id]").forEach((row) => observer.observe(row));

    // Scrolling can move another row under a stationary mouse without firing
    // mouseenter. Hit-test once per scroll frame, including smooth scrolling.
    let frame = 0;
    const trackPointer = (event: PointerEvent) => {
      menuPointerRef.current = event.pointerType === "mouse" ? { x: event.clientX, y: event.clientY } : null;
    };
    const clearPointer = () => { menuPointerRef.current = null; };
    const syncHover = () => {
      frame = 0;
      const pointer = menuPointerRef.current;
      if (!pointer || usesMenuTapPreview()) return;
      const row = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-menu-product-id]");
      if (!row || !root.contains(row)) return;
      const product = byId.get(row.dataset.menuProductId ?? "");
      if (product) flushSync(() => setMenuShowcaseProduct((current) => current.id === product.id ? current : product));
    };
    const onScroll = () => { if (menuPointerRef.current && !frame) frame = requestAnimationFrame(syncHover); };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.documentElement.addEventListener("pointerleave", clearPointer);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", clearPointer);
      document.documentElement.removeEventListener("pointerleave", clearPointer);
    };
  }, [products]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  /* The cart survives sign-in and email verification, which reload the page.
     The server re-prices every item, so a stored unitPrice is display only. */
  const cartRestored = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("deaf-shark-cart") ?? "null") as { savedAt: number; items: CartItem[] } | null;
      if (saved && Date.now() - saved.savedAt < 12 * 60 * 60_000 && Array.isArray(saved.items)) setCart(mergeCartLines(saved.items));
    } catch { /* storage unavailable */ }
    cartRestored.current = true;
  }, []);
  useEffect(() => {
    if (!cartRestored.current) return;
    try {
      if (cart.length) localStorage.setItem("deaf-shark-cart", JSON.stringify({ savedAt: Date.now(), items: cart }));
      else localStorage.removeItem("deaf-shark-cart");
    } catch { /* storage unavailable */ }
  }, [cart]);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const justAddedTimer = useRef<number | undefined>(undefined);
  const [cartFlight, setCartFlight] = useState<CartFlight | null>(null);
  const cartFlightTimer = useRef<number | undefined>(undefined);
  const [cartPulse, setCartPulse] = useState(false);
  const cartPulseTimer = useRef<number | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [prepTime, setPrepTime] = useState(15);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  /* A timed pause reaching zero reopens ordering right away; the next poll confirms. */
  const endPause = useCallback(() => { setOrdersPaused(false); setPausedUntil(null); }, []);
  const [scheduling, setScheduling] = useState<SchedulingSettings>({ enabled: true, horizonMinutes: 240, slotMinutes: 15 });
  const [confirmation, setConfirmation] = useState<{ number: string; eta: string } | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<Product | null>(null);
  const [activeMenuImage, setActiveMenuImage] = useState<{ src: string; title: string } | null>(null);
  const productDialogTrigger = useRef<HTMLElement | null>(null);
  const isMenuPage = page === "menu";
  const oceanBlend = products.find((product) => product.id === "ocean-blend-bag") ?? menuProducts.find((product) => product.id === "ocean-blend-bag")!;

  useEffect(() => {
    if (!activeVideoModal && !activeMenuImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveVideoModal(null);
        setActiveMenuImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeVideoModal, activeMenuImage]);

  const [swipeDirection, setSwipeDirection] = useState<"next" | "prev">("next");
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const justSwipedRef = useRef(false);

  const goToNextSlide = useCallback(() => {
    setSwipeDirection("next");
    setHeroProduct((current) => {
      const index = featuredSlides.findIndex((item) => item.id === current.id);
      return featuredSlides[(index + 1) % featuredSlides.length] ?? current;
    });
  }, [featuredSlides]);

  const goToPrevSlide = useCallback(() => {
    setSwipeDirection("prev");
    setHeroProduct((current) => {
      const index = featuredSlides.findIndex((item) => item.id === current.id);
      return featuredSlides[(index - 1 + featuredSlides.length) % featuredSlides.length] ?? current;
    });
  }, [featuredSlides]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchCurrentRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchCurrentRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchCurrentRef.current) return;
    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
    const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    touchCurrentRef.current = null;

    if (Math.abs(deltaX) >= 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1 && deltaTime < 1200) {
      justSwipedRef.current = true;
      window.setTimeout(() => {
        justSwipedRef.current = false;
      }, 250);

      if (deltaX < 0) {
        goToNextSlide();
      } else {
        goToPrevSlide();
      }
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !pointerStartRef.current) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;
    const deltaTime = Date.now() - pointerStartRef.current.time;
    pointerStartRef.current = null;

    if (Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1 && deltaTime < 1200) {
      justSwipedRef.current = true;
      window.setTimeout(() => {
        justSwipedRef.current = false;
      }, 250);

      if (deltaX < 0) {
        goToNextSlide();
      } else {
        goToPrevSlide();
      }
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (justSwipedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (activeVideoModal) return;
    const timer = window.setInterval(() => {
      goToNextSlide();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeVideoModal, heroProduct.id, goToNextSlide]);

  useEffect(() => {
    if (isMenuPage) return;
    fetch("/api/site-content", { cache: "no-store" })
      .then((response) => response.ok
        ? response.json() as Promise<{ featured?: FeaturedSlideResponse[] } | null>
        : null)
      .then((data) => {
        if (!data?.featured?.length) return;
        const slides = data.featured.flatMap((entry) => {
          const product = menuProducts.find((candidate) => candidate.id === entry.productId);
          if (!product) return [];
          /* Older rows carry a retired label ("Non-Coffee") or one that is just
             the raw menu category, which is what made the matcha slide flip from
             "Beverages" to "Matcha" once this fetch landed. Ignore both and keep
             the slide's own label; a real custom label still wins. */
          const staticLabel = featuredProducts.find((slide) => slide.id === product.id)?.featuredCategoryLabel;
          const storedLabel = entry.categoryLabel?.trim() ?? "";
          const isStaleLabel = storedLabel === "Non-Coffee" || (Boolean(staticLabel) && storedLabel === product.category);
          const entryLabel = isStaleLabel ? "" : storedLabel;
          return [{
            ...product,
            name: entry.title || product.name,
            price: Number(entry.priceCents) / 100,
            video: entry.mediaUrl || product.video,
            featuredButtonLabel: entry.buttonLabel || "Add to cart",
            featuredCategoryLabel: entryLabel || staticLabel || product.category,
          } as FeaturedProduct];
        });
        if (slides.length) {
          setFeaturedSlides(slides);
          setHeroProduct(slides[0]);
        }
      })
      .catch(() => undefined);
  }, [isMenuPage]);

  useEffect(() => {
    const itemId = new URLSearchParams(window.location.search).get("item");
    if (!itemId) return;
    const product = menuProducts.find((candidate) => candidate.id === itemId);
    if (!product) return;
    const timer = window.setTimeout(() => {
      setMenuShowcaseProduct(product);
      setActiveCategory(product.category);
      setSelectedProduct(product);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMenuPage) return;

    let frame = 0;
    let settleTimer = 0;

    const positionHashSection = () => {
      const hashId = window.location.hash.slice(1);
      if (!hashId.startsWith("menu-cat-")) return;

      const category = categories.find((candidate) => categoryId(candidate) === hashId);
      const target = document.getElementById(hashId);
      if (!category || !target) return;

      setActiveCategory(category);
      const firstProduct = menuProducts.find((product) => product.category === category);
      if (firstProduct) setMenuShowcaseProduct(firstProduct);

      const scrollToTarget = () => {
        const targetTop = window.scrollY + target.getBoundingClientRect().top;
        const stickyNav = document.querySelector(".standalone-order .category-nav-wrap");
        const stickyNavHeight = stickyNav?.getBoundingClientRect().height ?? 46;
        const standardTop = 84 + stickyNavHeight + 8;
        const desiredTop = pinnedMenuBottom() ?? (category === "Coffee Beans"
          ? Math.max(standardTop, window.innerHeight - 180)
          : standardTop);
        const destination = Math.max(0, targetTop - desiredTop);
        const lenis = (window as unknown as {
          __lenis?: { scrollTo: (target: number, options?: Record<string, unknown>) => void };
        }).__lenis;

        if (lenis) lenis.scrollTo(destination, { immediate: true, force: true });
        else window.scrollTo({ top: destination, behavior: "auto" });

        /* Keep the footer-selected category active even though the preceding
           refrigerator rows intentionally remain visible above its heading. */
        setActiveCategory(category);
      };

      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(scrollToTarget);
      });
      settleTimer = window.setTimeout(scrollToTarget, 180);
    };

    positionHashSection();
    window.addEventListener("hashchange", positionHashSection);
    return () => {
      window.removeEventListener("hashchange", positionHashSection);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [isMenuPage]);

  useLayoutEffect(() => {
    if (!isMenuPage) return;
    const nav = categoryNavRef.current;
    const indicator = categoryIndicatorRef.current;
    if (!nav || !indicator) return;

    let frame = 0;
    const positionIndicator = () => {
      const activeLabel = nav.querySelector<HTMLElement>("button.active .category-nav-label");
      if (!activeLabel) return;
      const navRect = nav.getBoundingClientRect();
      const labelRect = activeLabel.getBoundingClientRect();
      const left = labelRect.left - navRect.left + nav.scrollLeft;
      indicator.style.width = `${labelRect.width}px`;
      indicator.style.transform = `translate3d(${left}px, 0, 0)`;
      indicator.style.opacity = "1";
    };

    const keepActiveCategoryVisible = () => {
      const activeButton = nav.querySelector<HTMLElement>("button.active");
      if (!activeButton) return;
      const navRect = nav.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const edgePadding = 14;
      if (buttonRect.left >= navRect.left + edgePadding && buttonRect.right <= navRect.right - edgePadding) return;
      const centeredLeft = activeButton.offsetLeft + activeButton.offsetWidth / 2 - nav.clientWidth / 2;
      nav.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
    };

    positionIndicator();
    frame = window.requestAnimationFrame(() => {
      positionIndicator();
      keepActiveCategoryVisible();
    });
    const resizeObserver = new ResizeObserver(positionIndicator);
    resizeObserver.observe(nav);
    window.addEventListener("resize", positionIndicator);
    document.fonts?.ready.then(positionIndicator).catch(() => undefined);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", positionIndicator);
    };
  }, [activeCategory, isMenuPage]);

  useLayoutEffect(() => {
    if (!isMenuPage) return;
    const nav = mobileCategoryNavRef.current;
    const activeButton = nav?.querySelector<HTMLElement>("button.active");
    if (!nav || !activeButton) return;
    const centeredLeft = activeButton.offsetLeft + activeButton.offsetWidth / 2 - nav.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
  }, [activeCategory, isMenuPage]);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const response = await fetch("/api/menu-state", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as {
            availability?: Record<string, boolean>;
            menu?: MenuContentOverride[];
            removed?: string[];
            prepTime?: number;
            paused?: boolean;
            pausedUntil?: number | null;
            scheduling?: SchedulingSettings;
          };
          setAvailability(data.availability ?? {});
          if (Array.isArray(data.menu)) {
            const overrides = new Map<string, MenuContentOverride>(data.menu.map((item: MenuContentOverride) => [item.productId, item]));
            const removed = new Set(Array.isArray(data.removed) ? data.removed : []);
            const nextProducts = menuProducts
              .filter((product) => !removed.has(product.id))
              .map((product) => applyMenuContentOverride(product, overrides.get(product.id)));
            setProducts((current) => JSON.stringify(current) === JSON.stringify(nextProducts) ? current : nextProducts);
          }
          if (typeof data.prepTime === "number") setPrepTime(data.prepTime);
          if (typeof data.paused === "boolean") setOrdersPaused(data.paused);
          setPausedUntil(data.paused && typeof data.pausedUntil === "number" ? data.pausedUntil : null);
          if (data.scheduling) setScheduling(data.scheduling);
        }
      } catch {
        // Menu remains available if the demo database is not connected yet.
      }
    }
    loadAvailability();
    /* Ordering pause/resume is an active counter control. Keep the customer UI
       close to live so a staff resume re-enables ordering without a refresh. */
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadAvailability();
    };
    const timer = window.setInterval(loadAvailability, 5000);
    window.addEventListener("focus", loadAvailability);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", loadAvailability);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const isModalOpen = Boolean(selectedProduct || cartOpen || checkoutOpen || confirmation || activeVideoModal);

  useEffect(() => {
    return () => {
      window.clearTimeout(justAddedTimer.current);
      window.clearTimeout(cartFlightTimer.current);
      window.clearTimeout(cartPulseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add("modal-open");
      (window as unknown as { __lenis?: { stop: () => void } }).__lenis?.stop();
    } else {
      document.body.classList.remove("modal-open");
      (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
    }
    return () => {
      document.body.classList.remove("modal-open");
      (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
    };
  }, [isModalOpen]);

  function openProduct(product: Product) {
    if (availability[product.id] === false) return;
    productDialogTrigger.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setMenuShowcaseProduct(product);
    setSelectedProduct(product);
  }

  function closeProduct() {
    setSelectedProduct(null);
    if (editingCartItem) {
      setEditingCartItem(null);
      setCartOpen(true);
      return;
    }
    window.requestAnimationFrame(() => productDialogTrigger.current?.focus());
  }

  function launchCartFeedback(source?: HTMLElement | null) {
    const start = source?.getBoundingClientRect();
    const target = document.querySelector<HTMLElement>(".header-cart")?.getBoundingClientRect();
    const fromX = start ? start.left + start.width / 2 : window.innerWidth / 2;
    const fromY = start ? start.top + start.height / 2 : window.innerHeight / 2;
    const toX = target ? target.left + target.width / 2 : window.innerWidth - 42;
    const toY = target ? target.top + target.height / 2 : 34;

    window.clearTimeout(cartFlightTimer.current);
    window.clearTimeout(cartPulseTimer.current);
    setCartFlight({ id: Date.now(), fromX, fromY, toX, toY });
    setCartPulse(false);
    cartFlightTimer.current = window.setTimeout(() => {
      setCartFlight(null);
      setCartPulse(true);
      cartPulseTimer.current = window.setTimeout(() => setCartPulse(false), 420);
    }, 640);
  }

  function quickAdd(product: Product, source?: HTMLElement | null) {
    if (quantityInCart(cart, product.id) >= MAX_PER_ITEM) return;
    setCart((current) => mergeCartLines([...current, {
      key: `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      options: [],
      prepStation: prepStationFor(product),
    }]));
    launchCartFeedback(source);
    setJustAdded(product.id);
    window.clearTimeout(justAddedTimer.current);
    justAddedTimer.current = window.setTimeout(() => setJustAdded(null), 1100);
  }

  function activateMenuProduct(product: Product) {
    if (usesMenuTapPreview() && menuShowcaseProduct.id !== product.id) {
      setMenuShowcaseProduct(product);
      return;
    }

    /* A second tap always opens the item sheet, even with no options, so tapping a
       row never silently adds to the cart. Only the cart button quick-adds. */
    openProduct(product);
  }

  function addHeroProduct(event: MouseEvent<HTMLButtonElement>) {
    if (heroProduct.configurable) openProduct(heroProduct);
    else quickAdd(heroProduct, event.currentTarget);
  }

  function handleEditCartItem(item: CartItem) {
    const prod = products.find((p) => p.id === item.id);
    if (prod) {
      setEditingCartItem(item);
      setSelectedProduct(prod);
      setCartOpen(false);
    }
  }

  function handleSaveConfiguredItem(item: CartItem, source?: HTMLElement | null) {
    const allowed = MAX_PER_ITEM - quantityInCart(cart, item.id, editingCartItem?.key);
    if (allowed < 1) return;
    item = { ...item, quantity: Math.min(item.quantity, allowed) };
    if (editingCartItem) {
      setCart((current) =>
        mergeCartLines(current.map((c) => (c.key === editingCartItem.key ? item : c)))
      );
      setEditingCartItem(null);
    } else {
      setCart((current) => mergeCartLines([...current, item]));
    }
    launchCartFeedback(source);
    setSelectedProduct(null);
    window.setTimeout(() => setCartOpen(true), 360);
  }

  function scrollToCategory(category: MenuCategory) {
    const target = document.getElementById(categoryId(category));
    if (!target) return;
    const nav = document.querySelector(".standalone-order .category-nav-wrap");
    const navHeight = nav ? nav.getBoundingClientRect().height : 46;
    const standardTop = 84 + navHeight + 8;
    /* Coffee Beans is a short final section. Keep the last refrigerator rows
       in view above it instead of over-scrolling the heading to the top. */
    const desiredTop = pinnedMenuBottom() ?? (category === "Coffee Beans"
      ? Math.max(standardTop, window.innerHeight - 180)
      : standardTop);
    const y = window.scrollY + target.getBoundingClientRect().top - desiredTop;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setActiveCategory(category);
    const first = products.find((p) => p.category === category);
    if (first) setMenuShowcaseProduct(first);
  }

  /* Reads the strip on demand rather than holding on to one element, because
     the menu can re-render the strip after this component mounts. */
  const updateCategoryStripEdges = useCallback(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;
    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const next = { atStart: nav.scrollLeft <= 2, atEnd: nav.scrollLeft >= maxScroll - 2 };
    setCategoryStripEdges((current) => (current.atStart === next.atStart && current.atEnd === next.atEnd ? current : next));
  }, []);

  useEffect(() => {
    if (!isMenuPage) return;
    const frame = window.requestAnimationFrame(updateCategoryStripEdges);
    window.addEventListener("resize", updateCategoryStripEdges, { passive: true });
    document.fonts?.ready.then(updateCategoryStripEdges).catch(() => undefined);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateCategoryStripEdges);
    };
  }, [isMenuPage, updateCategoryStripEdges]);

  /* The arrows page the strip sideways to reveal hidden categories. They do not
     change the selected category. */
  function scrollCategoryStrip(direction: -1 | 1) {
    const nav = categoryNavRef.current;
    if (!nav) return;
    nav.scrollBy({ left: direction * Math.max(160, nav.clientWidth * 0.7), behavior: "smooth" });
  }

  function stepMobileCategory(direction: -1 | 1) {
    const currentIndex = Math.max(0, categories.indexOf(activeCategory));
    const nextIndex = Math.min(categories.length - 1, Math.max(0, currentIndex + direction));
    scrollToCategory(categories[nextIndex]);
  }

  function renderRow(product: Product) {
    const soldOut = availability[product.id] === false;
    const isSelected = menuShowcaseProduct.id === product.id;
    return (
      <div className="menu-item-row-wrap" key={product.id} data-menu-product-id={product.id}
        onPointerEnter={(event) => {
          // Continuous pointer events can otherwise commit after the next paint.
          if (event.pointerType === "mouse" && !usesMenuTapPreview()) flushSync(() => setMenuShowcaseProduct((current) => current.id === product.id ? current : product));
        }}
        onFocus={(event) => {
          // Touch focus precedes click; changing selection there would turn a
          // first tap into an add-to-cart instead of the existing preview step.
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) setMenuShowcaseProduct(product);
        }}
      >
        <button
          className={`menu-item-row ${isSelected ? "selected has-mobile-actions" : ""} ${soldOut ? "sold-out" : ""}`}
          onClick={() => activateMenuProduct(product)}
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
          CUSTOM_CHECKOUT_ENABLED ? <button
            type="button"
            className={`item-quick-add ${justAdded === product.id ? "added" : ""}`}
            onClick={(event) => product.configurable ? openProduct(product) : quickAdd(product, event.currentTarget)}
            aria-label={`${product.configurable ? "Customize" : "Add"} ${product.name}`}
            title={`${product.configurable ? "Customize" : "Add"} ${product.name}`}
          >
            <span className="universal-cart-glyph" aria-hidden="true" />
            <span className="quick-add-plus" aria-hidden="true" />
          </button> : <OrderOnlineLink
            className="item-quick-add"
            ariaLabel={`Order ${product.name} online`}
          >
            <span className="universal-cart-glyph" aria-hidden="true" />
            <span className="quick-add-plus" aria-hidden="true" />
          </OrderOnlineLink>
        )}
        {!soldOut && isSelected && (
          <div className="item-selected-actions" aria-label={`${product.name} actions`}>
            {product.configurable && (
              <button
                type="button"
                className="item-customize-button"
                onClick={() => openProduct(product)}
                aria-label={`Customize ${product.name}`}
                title={`Customize ${product.name}`}
              >
                <svg className="item-pencil-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14.7 5.3 18.7 9.3M4 20l1.1-4.6L16.8 3.7a2.1 2.1 0 0 1 3 3L8.1 18.4 4 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {CUSTOM_CHECKOUT_ENABLED ? (
              <button
                type="button"
                className={`item-selected-cart ${justAdded === product.id ? "added" : ""}`}
                onClick={(event) => product.configurable ? openProduct(product) : quickAdd(product, event.currentTarget)}
                aria-label={`${product.configurable ? "Customize" : justAdded === product.id ? "Added" : "Add"} ${product.name}${product.configurable ? "" : " to cart"}`}
                title={product.configurable ? "Customize" : justAdded === product.id ? "Added" : "Add to cart"}
              >
                <span className="universal-cart-glyph" aria-hidden="true" />
                <span className="quick-add-plus" aria-hidden="true" />
              </button>
            ) : (
              <OrderOnlineLink className="item-selected-cart" ariaLabel={`Add ${product.name} to cart`}>
                <span className="universal-cart-glyph" aria-hidden="true" />
                <span className="quick-add-plus" aria-hidden="true" />
              </OrderOnlineLink>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderItems(items: Product[], parentCategory?: MenuCategory, showSections = true) {
    const hasSections = showSections && items.some((item) => Boolean(item.section));
    if (!hasSections) {
      return items.map(renderRow);
    }

    const groups: { title?: string; items: Product[] }[] = [];
    for (const item of items) {
      const currentSection = item.section;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.title === currentSection) {
        lastGroup.items.push(item);
      } else {
        groups.push({ title: currentSection, items: [item] });
      }
    }

    return groups.map((group, idx) => (
      <div key={group.title || `group-${idx}`} className="menu-subsection-group">
        {group.title && group.title !== parentCategory && (
          <div className="menu-subsection-header">
            <h4 className="menu-subsection-title">{group.title}</h4>
            <span className="menu-subsection-line" aria-hidden="true" />
          </div>
        )}
        <div className="menu-subsection-items">
          {group.items.map(renderRow)}
        </div>
      </div>
    ));
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
      const finalSection = blocks[blocks.length - 1];
      const pinnedBottom = pinnedMenuBottom();
      const activeLine = pinnedBottom ?? 150;
      const coffeeBeansFramed = pinnedBottom === null
        && finalSection.getBoundingClientRect().top <= window.innerHeight - 170;
      if (coffeeBeansFramed) {
        best = finalSection;
      } else {
        let bestDist = Infinity;
        for (const el of blocks) {
          const d = Math.abs(el.getBoundingClientRect().top - activeLine);
          if (d < bestDist) { bestDist = d; best = el; }
        }
      }
      const match = categories.find((c) => categoryId(c) === best.id);
      if (match) setActiveCategory((prev) => (prev === match ? prev : match));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuPage]);

  const renderHeroProductPanel = (className = "") => (
    <div
      className={`hero-product ${className}`.trim()}
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      <div key={`${heroProduct.id}-category`} className={`hero-product-category hero-text-swipe hero-swipe-${swipeDirection}`}>
        {heroProduct.featuredCategoryLabel || heroProduct.category}
      </div>
      <div key={heroProduct.id} className={`hero-visual-container hero-visual-swipe hero-swipe-${swipeDirection}`}>
        {heroProduct.video ? (
          <HeroFeaturedVideo
            product={heroProduct}
            onOpenModal={() => setActiveVideoModal(heroProduct)}
          />
        ) : (
          <ProductVisual product={heroProduct} />
        )}
      </div>
      {featuredSlides.length > 1 && (
        <>
          <button type="button" className="hero-slide-arrow hero-slide-arrow-prev" aria-label="Previous featured video" onClick={goToPrevSlide}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="hero-slide-arrow hero-slide-arrow-next" aria-label="Next featured video" onClick={goToNextSlide}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
      <div className="hero-product-caption">
        <div key={heroProduct.id} className={`hero-product-text hero-text-swipe hero-swipe-${swipeDirection}`}>
          <strong>{heroProduct.name}</strong>
        </div>
        <button type="button" className="hero-add-btn" aria-label={`Add ${heroProduct.name} to order`} onClick={addHeroProduct}>
          <span>Add to order · <PriceTicker targetPrice={heroProduct.price} /></span>
          <span className="btn-cart-glyph" />
        </button>
      </div>
      <div className="product-dots" aria-label="Featured products">
        {featuredSlides.map((product, idx) => {
          const isActive = product.id === heroProduct.id;
          return (
            <button
              key={product.id}
              className={isActive ? "active" : ""}
              onClick={() => {
                const currentIdx = featuredSlides.findIndex((p) => p.id === heroProduct.id);
                setSwipeDirection(idx >= currentIdx ? "next" : "prev");
                setHeroProduct(product);
              }}
              aria-label={`Show ${product.name}`}
            >
              {isActive && <span key={`${product.id}-timer`} className="dot-fill" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <main>
      <CustomerHeader
        active={isMenuPage ? "/menu" : "/"}
        action={CUSTOM_CHECKOUT_ENABLED ?
          <button className={`header-cart ${cartPulse ? "cart-pulse" : ""}`} onClick={() => setCartOpen(true)} aria-label={`Open cart with ${cartCount} items`}>
            <img src="/cart-icon-white.png" className="cart-glyph" alt="" aria-hidden="true" />
            <span>{cartCount}</span>
          </button> : <OrderOnlineLink className="header-cart" ariaLabel="Order online">
            <img src="/cart-icon-white.png" className="cart-glyph" alt="" aria-hidden="true" />
            <span aria-hidden="true">
              <svg className="header-order-arrow" viewBox="0 0 12 12" fill="none">
                <path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </OrderOnlineLink>
        }
      />

      {!isMenuPage && <ScrollHero scrollHeights={3}>
        <section className="hero" id="top">
          <div className="hero-copy">
            <span className="eyebrow">Roasted in Union, New Jersey</span>
            <h1><span>Coffee from</span><span>El Salvador,</span><em>Roasted in Union</em></h1>
            <div className="hero-actions">
              <a className="primary-button hero-cta-btn" href="/menu">
                <span>Order online</span>
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
          {renderHeroProductPanel("hero-product-pinned")}
        </section>
      </ScrollHero>}

      <div className={`mobile-order-overlay-stage ${isMenuPage ? "is-standalone" : ""}`}>
        {!isMenuPage && renderHeroProductPanel("hero-product-mobile")}

        <section className={`order-section ${isMenuPage ? "standalone-order" : ""}`} id="menu">
        {/* The menu page carries the badge beside its title instead. */}
        {!isMenuPage && (
          <div className="order-section-badge-wrap" aria-hidden="true">
            <img src="/deafshark-logo-640.webp" alt="Deaf Shark Coffee" className="order-section-badge" decoding="async" />
          </div>
        )}
        <div className="menu-showcase-grid" ref={menuRowsRef}>
          {/* Left Column: Title + Clean Product Card + Brand Tag (Sticky) */}
          <aside className="menu-product-card-wrap">
            {/* The menu page is its own document, so its title is the h1 there.
                On the home page this block sits under the hero h1 and stays an h2.
                It sits outside the pin so it scrolls away on mobile instead of sticking. */}
            <div className="menu-sidebar-heading">
              {isMenuPage
                ? <h1 className="menu-panel-heading">The Full Deaf Shark Menu</h1>
                : <h2>Salvadoran roasts, poured fresh.</h2>}
            </div>
            <div className="menu-product-pin">
              <div className="menu-product-card-sticky-mask">
                <div className="menu-product-card">
                  <ProductVisual product={menuShowcaseProduct} menuPreview />
                  <button
                    className="menu-card-pill"
                    onClick={() => openProduct(menuShowcaseProduct)}
                    aria-label={`Customize ${menuShowcaseProduct.name}`}
                  >
                    {menuShowcaseProduct.name} · {money(menuShowcaseProduct.price)}
                  </button>
                </div>
              </div>
              <div className="menu-card-brand">
                <img src="/favicon.png" alt="" />
                <div className="menu-brand-text">
                  <strong>DEAF SHARK COFFEE</strong>
                  <span className="brand-dot">·</span>
                  <small>Roasted in Union.</small>
                </div>
              </div>
              {isMenuPage && (
                <div className="mobile-menu-pinned-controls">
                  <div className="mobile-category-nav-shell">
                    <button
                      type="button"
                      className="mobile-category-arrow"
                      onClick={() => stepMobileCategory(-1)}
                      disabled={activeCategory === categories[0]}
                      aria-label="Previous menu category"
                    >
                      <span aria-hidden="true">‹</span>
                    </button>
                    <div ref={mobileCategoryNavRef} className="mobile-category-nav" role="tablist" aria-label="Menu categories">
                      {categories.map((category) => (
                        <button
                          key={category}
                          role="tab"
                          aria-selected={activeCategory === category}
                          className={activeCategory === category ? "active" : ""}
                          onClick={() => scrollToCategory(category)}
                        >
                          {categoryLabel(category)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mobile-category-arrow"
                      onClick={() => stepMobileCategory(1)}
                      disabled={activeCategory === categories[categories.length - 1]}
                      aria-label="Next menu category"
                    >
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                  <div className="mobile-pinned-category-header">
                    <h3>{categoryLabel(activeCategory)}</h3>
                    {DRINK_CATEGORIES.includes(activeCategory) && (
                      <span>Whole, skim, oat, almond, or half and half · no extra charge</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Menu List with Dotted Leaders */}
          <div className="menu-list-panel">
            {isMenuPage && (
              <div className="category-nav-wrap has-arrows">
                <button
                  type="button"
                  className="category-nav-arrow"
                  onClick={() => scrollCategoryStrip(-1)}
                  disabled={categoryStripEdges.atStart}
                  aria-label="Show earlier menu categories"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <div ref={categoryNavRef} className="category-nav" role="tablist" aria-label="Menu categories" onScroll={updateCategoryStripEdges}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      role="tab"
                      aria-selected={activeCategory === category}
                      className={activeCategory === category ? "active" : ""}
                      onClick={() => scrollToCategory(category)}
                    >
                      <span className="category-nav-label">{categoryLabel(category)}</span>
                    </button>
                  ))}
                  <span ref={categoryIndicatorRef} className="category-nav-indicator" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  className="category-nav-arrow"
                  onClick={() => scrollCategoryStrip(1)}
                  disabled={categoryStripEdges.atEnd}
                  aria-label="Show more menu categories"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            )}

            {/*
              The menu page shows every category at once. The buttons jump to a
              section rather than filtering it, so nothing is hidden behind a click.
              Each section title stays pinned while its own items scroll. The next
              category naturally replaces it when its section reaches the top.
            */}
            {isMenuPage ? (
              categories.map((category) => {
                const items = products
                  .filter((p) => p.category === category)
                  .sort((a, b) => {
                    if (category !== "Coffee") return 0;
                    const aTemps = temperaturesFor(a);
                    const bTemps = temperaturesFor(b);
                    const aIsHotOnly = aTemps.length === 1 && aTemps[0] === "Hot";
                    const bIsHotOnly = bTemps.length === 1 && bTemps[0] === "Hot";
                    return Number(aIsHotOnly) - Number(bIsHotOnly);
                  });
                if (!items.length) return null;
                return (
                  <section className="menu-category-block" key={category} id={categoryId(category)}>
                    <div className="menu-panel-header">
                      <div>
                        <h3>{categoryLabel(category)}</h3>
                      </div>
                      {DRINK_CATEGORIES.includes(category) && (
                        <span className="menu-milk-note">Whole, skim, oat, almond, or half and half · no extra charge</span>
                      )}
                    </div>
                    <div className="menu-items-list">{renderItems(items, category)}</div>
                  </section>
                );
              })
            ) : (
              <section className="menu-category-block">
                <div className="menu-panel-header">
                  <div>
                    <h3>Some of Our Refreshments</h3>
                  </div>
                  <span className="menu-milk-note">Whole, skim, oat, almond, or half and half · no extra charge</span>
                </div>
                <div className="menu-items-list">
                  {renderItems(
                    products.filter((p) => {
                      if (!DRINK_CATEGORIES.includes(p.category)) return false;
                      const temps = temperaturesFor(p);
                      return !(temps.length === 1 && temps[0] === "Hot");
                    }),
                    undefined,
                    false,
                  )}
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
      </div>

      {!isMenuPage && (
        <div className="mobile-menu-cta-shelf">
          <a href="/menu" className="primary-button hero-cta-btn menu-full-button">
            <span>View our full menu</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      {!isMenuPage && <section className="take-home-section">
        {/* Mobile only: the copy panel sits below the video there, so the section
            needs a heading up top to say what it is. */}
        <div className="take-home-banner">Take Home Our Roast!</div>
        <div className="take-home-image">
          <img src="/ocean-blend-bags-900.webp" alt="Deaf Shark Ocean Blend coffee bags displayed in the Union shop" loading="lazy" decoding="async" />
        </div>
        <div className="take-home-copy">
          <div className="take-home-body">
            <h2>Take Our Roast Home</h2>
            <ul className="take-home-features">
              <li><span className="take-home-num">-</span> 12 oz bag</li>
              <li><span className="take-home-num">-</span> Ocean Blend</li>
              <li><span className="take-home-num">-</span> Medium roast</li>
              <li><span className="take-home-num">-</span> Whole bean</li>
              <li><span className="take-home-num">-</span> From El Salvador</li>
              <li><span className="take-home-num">-</span> Roasted in Union</li>
            </ul>
          </div>
          <div className="take-home-action">
            <img
              className="take-home-product-cutout"
              src="/menu/coffee/ocean-blend-single-bag-cutout-800.webp"
              alt="Deaf Shark Ocean Blend coffee bag"
              loading="lazy"
              decoding="async"
            />
            <button type="button" className="primary-button take-home-btn" aria-label="Add Ocean Blend to order" onClick={(event) => quickAdd(oceanBlend, event.currentTarget)}>
              <span>Add a bag · {money(oceanBlend.price)}</span>
              <span className="btn-cart-glyph" />
            </button>
          </div>
        </div>
        <div className="take-home-film">
          <LazyAutoplayVideo
            src="/ocean-blend-bags.mp4"
            poster="/ocean-blend-bags-900.webp"
            ariaLabel="Deaf Shark Ocean Blend bags on display"
          />
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
          <div className="origin-profile">
            <div className="origin-profile-head">
              <strong>El Salvador</strong>
              <a href="/about" className="primary-button origin-story-button">Read our story</a>
            </div>
            <p>
              <span>Red Bourbon</span>
              <i aria-hidden="true">-</i>
              <span>Washed process</span>
              <i aria-hidden="true">-</i>
              <span>Medium roast</span>
            </p>
          </div>
        </div>
      </section>}

      {!isMenuPage && (
        <section className="menu-boards-section" id="menus">
          <div className="menu-boards-header">
            <h2>Food & Breakfast Menus</h2>
          </div>
          <div className="menu-boards-grid">
            <div className="menu-board-card">
              <div className="menu-board-img-wrap">
                <img
                  src="/menu-board-breakfast-v2.svg"
                  alt="Current Deaf Shark Coffee breakfast menu with descriptions and prices"
                  loading="lazy"
                />
                <a className="menu-board-view-link" href="/menu">View full menu</a>
                <button
                  type="button"
                  className="menu-board-zoom-badge"
                  aria-label="Expand breakfast menu image"
                  title="Expand menu image"
                  onClick={() => setActiveMenuImage({ src: "/menu-board-breakfast-v2.svg", title: "Breakfast Menu" })}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="menu-board-card">
              <div className="menu-board-img-wrap">
                <img
                  src="/menu-board-food-v2.svg"
                  alt="Current Deaf Shark Coffee sandwiches, bites, grab and go, and dessert menu with prices"
                  loading="lazy"
                />
                <a className="menu-board-view-link" href="/menu">View full menu</a>
                <button
                  type="button"
                  className="menu-board-zoom-badge"
                  aria-label="Expand food menu image"
                  title="Expand menu image"
                  onClick={() => setActiveMenuImage({ src: "/menu-board-food-v2.svg", title: "Food Menu" })}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isMenuPage && (
        <section className="visit-section" id="visit">
          <div className="visit-header-block">
            <div className="visit-title-wrap">
              <h2>Deaf Shark Coffee<br />Union, New Jersey</h2>
              <img src="/deafshark-logo-640.webp" alt="Deaf Shark Coffee" className="visit-brand-stamp" loading="lazy" decoding="async" />
            </div>
            <div className="visit-cards-row">
              <div className="visit-card">
                <span className="visit-card-label">Address</span>
                <strong>900 Green Lane</strong>
                <span>Union, NJ 07083</span>
                <a className="primary-button visit-action-btn hero-cta-btn" href="https://maps.google.com/?q=900+Green+Lane+Union+NJ+07083" target="_blank" rel="noopener noreferrer">
                  <span>Get directions</span>
                  <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2.5 8h11M9.5 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
              <div className="visit-card visit-hours-card">
                <span className="visit-card-label">Hours</span>
                <StoreHours />
                <a className="primary-button visit-action-btn visit-order-btn" href="/menu">
                  <span>Order online</span>
                  <span className="btn-cart-glyph" aria-hidden="true" />
                </a>
              </div>
              <div className="visit-card">
                <span className="visit-card-label">Contact</span>
                <strong>(908) 481-8884</strong>
                <span>Call ahead or stop in</span>
                <a className="primary-button visit-action-btn phone-ring-btn" href="tel:+19084818884">
                  <svg className="phone-ring-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Call shop</span>
                </a>
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
                <img src="/deafshark-logo-640.webp" alt="Deaf Shark Coffee" className="map-banner-logo" loading="lazy" decoding="async" />
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

      {selectedProduct && (
        <ProductConfigurator
          product={selectedProduct}
          initialItem={editingCartItem || undefined}
          maxQuantity={MAX_PER_ITEM - quantityInCart(cart, selectedProduct.id, editingCartItem?.key)}
          onClose={closeProduct}
          onAdd={handleSaveConfiguredItem}
          outIngredients={outIngredientsFrom(availability)}
          pause={{ paused: ordersPaused, until: pausedUntil, onEnd: endPause }}
        />
      )}
      {CUSTOM_CHECKOUT_ENABLED && (
        <CartDrawer
          isOpen={cartOpen}
          isCovered={checkoutOpen}
          cart={cart}
          subtotal={subtotal}
          recommendations={recommendCartAddOns(cart.map((item) => item.id), products, availability)}
          onClose={() => setCartOpen(false)}
          onEdit={handleEditCartItem}
          onRemove={(key) => setCart((current) => current.filter((item) => item.key !== key))}
          onQuantity={(key, delta) => setCart((current) => {
            const line = current.find((item) => item.key === key);
            if (!line) return current;
            const room = MAX_PER_ITEM - quantityInCart(current, line.id, key);
            const next = Math.max(1, Math.min(room, line.quantity + delta));
            return current.map((item) => (item.key === key ? { ...item, quantity: next } : item));
          })}
          onCheckout={() => {
            if (ordersPaused) return;
            setCheckoutOpen(true);
          }}
          onRecommendation={(product, source) => {
            if (product.configurable) {
              setCartOpen(false);
              openProduct(product);
            } else {
              quickAdd(product, source);
            }
          }}
          ordersPaused={ordersPaused}
          pausedUntil={pausedUntil}
          onPauseEnd={endPause}
        />
      )}
      {cartFlight && (
        <span
          key={cartFlight.id}
          className="cart-flight"
          style={{
            "--from-x": `${cartFlight.fromX}px`,
            "--from-y": `${cartFlight.fromY}px`,
            "--to-x": `${cartFlight.toX}px`,
            "--to-y": `${cartFlight.toY}px`,
          } as CSSProperties}
          aria-hidden="true"
        >
          <span className="universal-cart-glyph" />
          <span className="quick-add-plus" />
        </span>
      )}
      {CUSTOM_CHECKOUT_ENABLED && checkoutOpen && (
        <Checkout prepTime={prepTime} scheduling={scheduling} ordersPaused={ordersPaused} pausedUntil={pausedUntil} onPauseEnd={endPause} cart={cart} subtotal={subtotal} onClose={() => setCheckoutOpen(false)} onComplete={(number, eta) => { setCheckoutOpen(false); setCartOpen(false); setCart([]); setConfirmation({ number, eta }); }} />
      )}
      {CUSTOM_CHECKOUT_ENABLED && confirmation && (
        <div className="modal-backdrop">
          <section className="confirmation-card" role="dialog" aria-modal="true">
            <img src="/deafshark-dog-art.png" alt="Deaf Shark character" />
            <span className="eyebrow">Order received</span>
            <h2>We have it.</h2>
            <p>Your pickup estimate is <strong>{confirmation.eta}</strong>. Please pay at the counter when you arrive.</p>
            <div className="confirmation-actions"><button className="primary-button" onClick={() => { const number = confirmation.number; setConfirmation(null); window.dispatchEvent(new CustomEvent("deaf-shark-open-order", { detail: { orderNumber: number } })); }}>View order status</button><button className="soft-button" onClick={() => setConfirmation(null)}>Back to the menu</button></div>
          </section>
        </div>
      )}

      {activeMenuImage && (
        <div className="modal-backdrop menu-board-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveMenuImage(null);
        }}>
          <div className="menu-board-modal-content" role="dialog" aria-modal="true" aria-label={activeMenuImage.title}>
            <button className="modal-close menu-board-modal-close" onClick={() => setActiveMenuImage(null)} aria-label="Close menu view">×</button>
            <img src={activeMenuImage.src} alt={activeMenuImage.title} className="menu-board-modal-img" />
          </div>
        </div>
      )}

      {activeVideoModal && (
        <CustomVideoModal
          product={activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
        />
      )}
    </main>
  );
}

function CustomVideoModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
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
    video.volume = 0.85;
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [isMuted, volume]);

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
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} video presentation`}
    >
      <div className="video-modal-dialog">
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
          >
            <track kind="captions" srcLang="en" label="English" src="/product-video-captions.vtt" />
          </video>

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
      </div>
    </div>
  );
}

function CartDrawer({
  isOpen,
  isCovered,
  cart,
  subtotal,
  recommendations,
  ordersPaused,
  pausedUntil = null,
  onPauseEnd,
  onClose,
  onEdit,
  onRemove,
  onQuantity,
  onCheckout,
  onRecommendation,
}: {
  isOpen: boolean;
  isCovered: boolean;
  cart: CartItem[];
  subtotal: number;
  recommendations: Product[];
  ordersPaused: boolean;
  pausedUntil?: number | null;
  onPauseEnd?: () => void;
  onClose: () => void;
  onEdit: (item: CartItem) => void;
  onRemove: (key: string) => void;
  onQuantity: (key: string, delta: number) => void;
  onCheckout: () => void;
  onRecommendation: (product: Product, source: HTMLButtonElement) => void;
}) {
  return (
    <div
      className={`cart-backdrop ${isOpen ? "is-open" : ""} ${isCovered ? "is-covered" : ""}`}
      aria-hidden={!isOpen || isCovered}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="cart-drawer" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Shopping cart">
        <div className="drawer-header">
          <div>
            <h2>Your cart</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="drawer-close-btn"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="cart-items">
          {cart.length === 0 && <div className="empty-cart"><img src="/favicon.png" alt="" /><h3>Your cart is ready when you are.</h3><p>Choose a drink, breakfast, sandwich, or bite from the menu.</p><a className="primary-button empty-cart-menu-button" href="/menu" onClick={onClose}>Go to menu</a></div>}
          {cart.map((item) => (
            <article key={item.key} className="cart-item">
              <div>
                <strong>{item.name}</strong>
                {item.options.length > 0 && <small>{item.options.join(" · ")}</small>}
                <div className="cart-item-actions">
                  <div className="cart-qty" aria-label={`Quantity of ${item.name}`}>
                    <button type="button" onClick={() => onQuantity(item.key, -1)} disabled={item.quantity <= 1} aria-label={`Decrease ${item.name} quantity`}>−</button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button type="button" onClick={() => onQuantity(item.key, 1)} disabled={cart.reduce((sum, line) => (line.id === item.id ? sum + line.quantity : sum), 0) >= MAX_PER_ITEM} aria-label={`Increase ${item.name} quantity`} title={`Limit of ${MAX_PER_ITEM} per item`}>+</button>
                  </div>
                  <button type="button" className="cart-edit-btn" onClick={() => onEdit(item)}>Edit</button>
                  <span className="cart-action-sep">·</span>
                  <button type="button" className="cart-remove-btn" onClick={() => onRemove(item.key)}>Remove</button>
                </div>
              </div>
              <strong>{money(item.unitPrice * item.quantity)}</strong>
            </article>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-summary">
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <small><em>Taxes are calculated at checkout.</em></small>
          {recommendations.length > 0 && (
            <section className="cart-recommendations" aria-labelledby="cart-recommendations-title">
              <h3 id="cart-recommendations-title">You may also want to add</h3>
              <div className="cart-recommendation-grid">
                {recommendations.map((product) => {
                  const photo = !product.imageComingSoon && productPhoto(product);
                  return (
                    <article className="cart-recommendation" key={product.id}>
                      <div className="cart-recommendation-photo">
                        {photo ? <img src={menuPreviewSrc(photo)} alt="" /> : <span aria-hidden="true">DS</span>}
                      </div>
                      <strong>{product.name}</strong>
                      <span>{priceLabel(product)}</span>
                      <button type="button" onClick={(event) => onRecommendation(product, event.currentTarget)}>
                        {product.configurable ? "Choose" : "Add"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {ordersPaused && <PauseNotice until={pausedUntil} onEnd={onPauseEnd} />}
          <button className="primary-button" disabled={ordersPaused} onClick={onCheckout}>{ordersPaused ? "Online ordering paused" : "Continue to checkout"}</button>
        </div>}
      </aside>
    </div>
  );
}

/* Crypto-random so two browsers can never collide on the same checkout key. */
function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function Checkout({ cart, subtotal, prepTime = 15, scheduling, ordersPaused, pausedUntil = null, onPauseEnd, onClose, onComplete }: { cart: CartItem[]; subtotal: number; prepTime?: number; scheduling: SchedulingSettings; ordersPaused: boolean; pausedUntil?: number | null; onPauseEnd?: () => void; onClose: () => void; onComplete: (number: string, eta: string, phone: string) => void }) {
  const dragRef = useRef<{ pointerId: number; startY: number; startedAt: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ scheduledFor?: string }>({});
  const [scheduleAnchor] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [smsOptIn, setSmsOptIn] = useState(false);
  /* One key per checkout session. A retry or a double-click reuses it, so the
     server resolves the second request to the order it already stored. */
  const [idempotencyKey] = useState(createIdempotencyKey);
  /* Launch policy: pay at pickup requires a signed-in account. Guest checkout
     opens once online payment is live. */
  const [account, setAccount] = useState<"loading" | "guest" | "member" | "error">("loading");
  const [legalAccepted, setLegalAccepted] = useState(false);
  type RewardTierInfo = { points: number; valueCents: number; label: string };
  const [rewardOffers, setRewardOffers] = useState<RewardTierInfo[]>([]);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [studentVerified, setStudentVerified] = useState(false);
  const [welcomeOfferReady, setWelcomeOfferReady] = useState(false);
  /* Rewards on for this account, and its balance, for the points preview. */
  const [loyaltyOn, setLoyaltyOn] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [discountChoice, setDiscountChoice] = useState<"none" | "reward" | "student" | "welcome">("none");
  const [welcomeItemIndex, setWelcomeItemIndex] = useState<number | null>(null);

  const closeSheet = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 280);
  }, [closing, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSheet]);

  function startSheetDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startedAt: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveSheetDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragOffset(Math.max(0, Math.min(window.innerHeight, event.clientY - drag.startY)));
  }

  function endSheetDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    const velocity = distance / Math.max(1, performance.now() - drag.startedAt);
    dragRef.current = null;
    setDragging(false);
    if (distance > 110 || (distance > 42 && velocity > 0.55)) closeSheet();
    else setDragOffset(0);
  }

  /* Shown so the customer can see what they will pay. The server recalculates
     all of this from their own record before the order is stored. */
  const subtotalCents = Math.round(subtotal * 100);
  const welcomeDrinkChoices = cart.flatMap((item, itemIndex) => {
    const product = menuProducts.find((candidate) => candidate.id === item.id);
    if (!product || !DRINK_CATEGORIES.includes(product.category)) return [];
    return [{ itemIndex, name: item.name, unitPriceCents: Math.round(item.unitPrice * 100) }];
  });
  const selectedWelcomeDrink = welcomeDrinkChoices.find((item) => item.itemIndex === welcomeItemIndex) ?? null;
  const selectedReward = rewardOffers.find((reward) => reward.points === rewardPoints) ?? null;
  const discountCents = discountChoice === "reward" && selectedReward
    ? Math.min(selectedReward.valueCents, subtotalCents)
    : discountChoice === "student" && studentVerified
      ? Math.floor((subtotalCents * 10) / 100)
      : discountChoice === "welcome" && welcomeOfferReady
        ? Math.min(Math.floor(((selectedWelcomeDrink?.unitPriceCents ?? 0) * 50) / 100), subtotalCents)
        : 0;
  const discount = discountCents / 100;
  const earnedPoints = pointsForSubtotal(subtotalCents - discountCents);
  const tax = (subtotal - discount) * 0.06625;

  useEffect(() => {
    let cancelled = false;
    async function loadAccount() {
      try {
        const response = await fetch("/api/profile", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("profile");
        const data = await response.json() as { authenticated: boolean; loyaltyEnabled?: boolean; profile?: { points?: number; displayName: string; phone?: string | null; studentVerified?: boolean; welcomeOffer?: { status: string } | null; rewards?: { available: RewardTierInfo | null; options?: RewardTierInfo[] }; legal?: { acceptedCurrent: boolean } } };
        if (cancelled) return;
        if (!data.authenticated) { setAccount("guest"); return; }
        setAccount("member");
        setLoyaltyOn(data.loyaltyEnabled === true);
        setPointsBalance(Number(data.profile?.points ?? 0));
        if (data.profile) {
          setName((current) => current || data.profile!.displayName);
          if (data.profile.phone) setPhone((current) => current || formatPhoneInput(data.profile!.phone!));
          const options = data.profile.rewards?.options ?? (data.profile.rewards?.available ? [data.profile.rewards.available] : []);
          setRewardOffers(options);
          setRewardPoints(options.at(-1)?.points ?? 0);
          setStudentVerified(Boolean(data.profile.studentVerified));
          setWelcomeOfferReady(data.profile.welcomeOffer?.status === "active");
          setLegalAccepted(Boolean(data.profile.legal?.acceptedCurrent));
        }
      } catch {
        if (!cancelled) setAccount("error");
      }
    }
    void loadAccount();
    window.addEventListener("deaf-shark-session-changed", loadAccount);
    return () => { cancelled = true; window.removeEventListener("deaf-shark-session-changed", loadAccount); };
  }, []);

  function localInputValue(date: Date) {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  const firstScheduledDate = new Date(Math.ceil((scheduleAnchor + prepTime * 60_000) / (scheduling.slotMinutes * 60_000)) * scheduling.slotMinutes * 60_000);
  const lastScheduledDate = new Date(scheduleAnchor + scheduling.horizonMinutes * 60_000);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const nextFieldErrors: { scheduledFor?: string } = {};
    if (fulfillmentType === "scheduled" && !scheduledFor) nextFieldErrors.scheduledFor = "Choose your pickup date and time.";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    if (!name.trim() || phone.replace(/\D/g, "").length !== 10) {
      setError("Your account is missing the name or mobile number needed for pickup orders.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the security check before placing your order.");
      return;
    }
    if (ordersPaused) {
      setError("Online ordering is temporarily paused. Please order at the counter.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          paymentMethod: "pickup",
          smsOptIn,
          fulfillmentType,
          scheduledFor: fulfillmentType === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
          turnstileToken,
          idempotencyKey,
          discount: discountChoice === "reward" && selectedReward
            ? { kind: "reward", points: selectedReward.points }
            : discountChoice === "welcome"
              ? { kind: "welcome", itemIndex: welcomeItemIndex }
            : { kind: discountChoice },
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity, selection: item.selection })),
        }),
      });
      const data = await response.json() as {
        error?: string;
        order: { orderNumber: string; pickupEta: string };
      };
      if (response.status === 401) setAccount("guest");
      if (!response.ok) throw new Error(data.error ?? "Unable to place order");
      /* Lets the header pick the new order up immediately rather than waiting
         for its next poll. */
      window.dispatchEvent(new Event("deaf-shark-order-placed"));
      onComplete(data.order.orderNumber, data.order.pickupEta, phone);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place order");
    } finally {
      setSubmitting(false);
      setTurnstileResetKey((current) => current + 1);
    }
  }

  return (
    <div className={`checkout-sheet-backdrop ${closing ? "is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSheet(); }}>
      <form
        className={`checkout-card checkout-sheet ${dragging ? "is-dragging" : ""}`}
        style={{ "--checkout-drag": `${dragOffset}px` } as CSSProperties}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onSubmit={submit}
        noValidate
      >
        <button
          type="button"
          className="checkout-sheet-handle"
          aria-label="Swipe down or press to return to your cart"
          onClick={() => { if (dragOffset === 0) closeSheet(); }}
          onPointerDown={startSheetDrag}
          onPointerMove={moveSheetDrag}
          onPointerUp={endSheetDrag}
          onPointerCancel={endSheetDrag}
        ><span /></button>
        <button type="button" className="modal-close" onClick={closeSheet} aria-label="Back to cart">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
        </button>
        <h2 id="checkout-title">Finish your order</h2>
        {ordersPaused && <PauseNotice until={pausedUntil} onEnd={onPauseEnd} />}
        {account === "loading" && <p className="checkout-account-note" role="status">Checking your account...</p>}
        {(account === "guest" || account === "error") && <div className="checkout-account-gate">
          <strong>{account === "error" ? "We could not check your account" : "Sign in to place your order"}</strong>
          <p>{account === "error" ? "Please check your connection and try again." : "Online orders are paid at pickup and need a free Deaf Shark account. Guest checkout with online payment is coming soon."}</p>
          <p>Your cart will be saved while you sign in.</p>
          <button type="button" className="primary-button" onClick={() => window.dispatchEvent(new Event("deaf-shark-open-account"))}>Sign in or create account</button>
        </div>}
        {account === "member" && !legalAccepted && <div className="checkout-account-gate">
          <strong>Review the current account terms</strong>
          <p>Open your account and accept the current Terms, Privacy Policy, and age requirement before ordering.</p>
          <button type="button" className="primary-button" onClick={() => window.dispatchEvent(new Event("deaf-shark-open-account"))}>Open my account</button>
        </div>}
        {account === "member" && legalAccepted && <>
        <div className="checkout-account-contact">
          <span>Ordering from your account</span>
          <div><strong>{name || "Account name"}</strong><small>{phone || "Mobile number on file"}</small></div>
        </div>
        <fieldset className="payment-options pickup-options">
          <legend>Pickup time</legend>
          <label htmlFor="fulfillment-asap" aria-label="As soon as possible"><input id="fulfillment-asap" type="radio" name="fulfillment" checked={fulfillmentType === "asap"} onChange={() => setFulfillmentType("asap")} /><span><strong>As soon as possible</strong><small>Estimated in about {prepTime} minutes</small></span></label>
          {scheduling.enabled && <label htmlFor="fulfillment-scheduled" aria-label="Schedule pickup"><input id="fulfillment-scheduled" type="radio" name="fulfillment" checked={fulfillmentType === "scheduled"} onChange={() => { setFulfillmentType("scheduled"); if (!scheduledFor) setScheduledFor(localInputValue(firstScheduledDate)); }} /><span><strong>Schedule pickup</strong><small>Choose a time within the next few hours</small></span></label>}
        </fieldset>
        {fulfillmentType === "scheduled" && <label className={fieldErrors.scheduledFor ? "has-error" : undefined}><span>Scheduled pickup</span><input type="datetime-local" value={scheduledFor} min={localInputValue(firstScheduledDate)} max={localInputValue(lastScheduledDate)} step={scheduling.slotMinutes * 60} onChange={(event) => { setScheduledFor(event.target.value); if (fieldErrors.scheduledFor) setFieldErrors((current) => ({ ...current, scheduledFor: undefined })); }} aria-invalid={fieldErrors.scheduledFor ? true : undefined} aria-describedby={fieldErrors.scheduledFor ? "checkout-schedule-error" : undefined} />{fieldErrors.scheduledFor && <small className="checkout-field-error" id="checkout-schedule-error" role="alert"><i aria-hidden="true">!</i>{fieldErrors.scheduledFor}</small>}</label>}
        <div className="checkout-pickup-info"><strong>Payment due at pickup</strong></div>
        {ORDER_READY_SMS_ENABLED && <label className="checkout-sms-consent" htmlFor="order-ready-text-consent" aria-label="Receive one order-ready text message">
          <input id="order-ready-text-consent" type="checkbox" checked={smsOptIn} onChange={(event) => setSmsOptIn(event.target.checked)} />
          <span><strong>Text me once when this order is ready.</strong><small>Optional. Message and data rates may apply. Reply STOP to opt out.</small></span>
        </label>}
        {(rewardOffers.length > 0 || studentVerified || welcomeOfferReady) && (
          <fieldset className="checkout-rewards">
            <legend>Rewards and discounts</legend>
            <p className="checkout-rewards-note">One per order.</p>
            <label htmlFor="discount-none"><input id="discount-none" type="radio" name="discount" checked={discountChoice === "none"} onChange={() => setDiscountChoice("none")} /><span>No discount</span></label>
            {rewardOffers.map((reward) => <label key={reward.points} htmlFor={`discount-reward-${reward.points}`}><input id={`discount-reward-${reward.points}`} type="radio" name="discount" checked={discountChoice === "reward" && rewardPoints === reward.points} onChange={() => { setRewardPoints(reward.points); setDiscountChoice("reward"); }} /><span>Redeem {reward.label}<small>Uses {reward.points} points</small></span></label>)}
            {welcomeOfferReady && <>
              <label htmlFor="discount-welcome"><input id="discount-welcome" type="radio" name="discount" checked={discountChoice === "welcome"} onChange={() => { setWelcomeItemIndex((current) => current ?? welcomeDrinkChoices[0]?.itemIndex ?? null); setDiscountChoice("welcome"); }} disabled={welcomeDrinkChoices.length === 0} /><span>50% off one drink<small>{welcomeDrinkChoices.length === 0 ? "Add a drink to use this" : "New member offer · one use only"}</small></span></label>
              {discountChoice === "welcome" && welcomeDrinkChoices.length > 0 && <div className="welcome-drink-picker" role="group" aria-label="Choose the drink for your signup coupon">
                <strong>Choose your 50% off drink</strong>
                {welcomeDrinkChoices.map((drink) => <label key={drink.itemIndex} htmlFor={`welcome-drink-${drink.itemIndex}`}><input id={`welcome-drink-${drink.itemIndex}`} type="radio" name="welcome-drink" checked={welcomeItemIndex === drink.itemIndex} onChange={() => setWelcomeItemIndex(drink.itemIndex)} /><span>{drink.name}<small>Save {money(Math.floor(drink.unitPriceCents * .5) / 100)}</small></span></label>)}
              </div>}
            </>}
            {studentVerified && <label htmlFor="discount-student"><input id="discount-student" type="radio" name="discount" checked={discountChoice === "student"} onChange={() => setDiscountChoice("student")} /><span>10% Kean student discount</span></label>}
          </fieldset>
        )}
        <div className="checkout-total">
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          {discount > 0 && <div><span>Discount</span><strong>-{money(discount)}</strong></div>}
          <div><span>Estimated tax</span><strong>{money(tax)}</strong></div>
          <div><span>Total</span><strong>{money(subtotal - discount + tax)}</strong></div>
        </div>
        {/* Same rule the server uses when the order is completed: one point per
            dollar paid after any discount, before tax. */}
        {loyaltyOn && earnedPoints > 0 && (
          <p className="checkout-points-preview">
            <strong>You will earn {earnedPoints} {earnedPoints === 1 ? "point" : "points"} with this order.</strong>
            <span>Points are added when you pick it up and each award expires after 12 months. You have {pointsBalance} now{discountChoice === "reward" && selectedReward ? `, and this order uses ${selectedReward.points}` : ""}.</span>
          </p>
        )}
        <div className="checkout-pickup-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{fulfillmentType === "scheduled" ? <>Pickup at <strong>{scheduledFor ? new Date(scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "your selected time"}</strong></> : <>Estimated pickup in <strong>about {prepTime} minutes</strong></>}</span>
        </div>
        <TurnstileWidget action="order" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={submitting || ordersPaused || !turnstileToken}>{submitting ? "Sending order..." : ordersPaused ? "Online ordering paused" : `Place pickup order · ${money(subtotal - discount + tax)}`}</button>
        </>}
      </form>
    </div>
  );
}
