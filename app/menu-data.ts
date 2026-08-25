export type MenuCategory =
  | "Coffee"
  | "Matcha"
  | "Tea"
  | "Smoothies"
  | "Breakfast"
  | "Sandwiches"
  | "Bites"
  | "From the Fridge"
  | "Coffee Beans";

export type PrepStation = "COFFEE" | "KITCHEN" | "RETAIL";

export type DrinkKey =
  | "latte"
  | "cortado"
  | "cappuccino"
  | "americano"
  | "espresso"
  | "drip-coffee"
  | "chicha"
  | "malta"
  | "horchata-latte"
  | "matcha"
  | "cold-brew"
  | "mocha"
  | "caramel-macchiato";

export type SizeOption = { label: string; price: number };
export type ModifierOption = { label: string; price?: number };
export type ModifierGroup = {
  label: string;
  type: "single" | "multiple";
  required?: boolean;
  options: ModifierOption[];
};

export type ProductSelection = {
  temperature?: "Hot" | "Iced";
  size?: string;
  milk?: string;
  flavor?: string;
  base?: string;
  extraShot?: number;
  syrups?: string[];
  modifiers?: Record<string, string[]>;
  notes?: string;
};

export type PricedSelection = {
  unitPrice: number;
  options: string[];
  selection: ProductSelection;
};

/* Sizes exactly as the shop board reads them. A drink with no `sizing` is a
   single price. Iced pours are 16 oz only, which is why the lists differ. */
export type DrinkSizing = { hot?: SizeOption[]; iced?: SizeOption[] };

export type Product = {
  id: string;
  name: string;
  category: Exclude<MenuCategory, "Popular">;
  section?: string;
  /* Explicit for exceptions; otherwise derived from the category. */
  prepStation?: PrepStation;
  /* Lowest price across sizes. The configurator charges by the chosen size. */
  price: number;
  description: string;
  popular?: boolean;
  configurable?: boolean;
  visual: "hot" | "iced" | "sandwich" | "bite" | "bag";
  photo?: string;
  /* Optional package photo for each retail flavor. The storefront swaps these
     in the configurator while preserving `photo` as the menu-card default. */
  flavorPhotos?: Record<string, string>;
  video?: string;
  drink?: DrinkKey;
  sizing?: DrinkSizing;
  /* Temperatures offered. Omitted means hot and iced. */
  temps?: ("Hot" | "Iced")[];
  /* A required pick-one list, used by tea flavors and the lunch special. */
  flavors?: string[];
  flavorLabel?: string;
  /* Smoothies are blended with water or milk. */
  bases?: string[];
  /* Espresso-based drinks that can be prepared decaf for an upcharge. */
  decafAvailable?: boolean;
  modifierGroups?: ModifierGroup[];
};

export type MenuContentOverride = {
  productId: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  photoUrl?: string | null;
};

export function applyMenuContentOverride(product: Product, override?: MenuContentOverride | null): Product {
  if (!override) return product;
  const hasCuratedCatalogPhoto = product.photo?.startsWith("/menu/");
  const nextPrice = Math.max(0, Number(override.priceCents) / 100);
  const delta = nextPrice - product.price;
  const adjust = (sizes?: SizeOption[]) => sizes?.map((size) => ({ ...size, price: Math.max(0, Number((size.price + delta).toFixed(2))) }));
  const overrideCategory = (override.category || product.category) as Product["category"];
  const category = (overrideCategory as string) === "Non-Coffee" ? product.category : overrideCategory;
  return {
    ...product,
    name: override.name || product.name,
    category,
    description: override.description?.includes("PLACEHOLDER") ? product.description : (override.description || product.description),
    price: nextPrice,
    photo: hasCuratedCatalogPhoto ? product.photo : (override.photoUrl || product.photo),
    sizing: product.sizing ? { hot: adjust(product.sizing.hot), iced: adjust(product.sizing.iced) } : product.sizing,
  };
}

export const SYRUP_PRICE = 0.5;
export const SYRUP_OPTIONS = [
  "Caramel",
  "Vanilla",
  "Lavender",
  "Salted Caramel",
  "Hazelnut",
  "French Vanilla",
  "Coconut",
] as const;

export const MILK_OPTIONS = ["Whole", "Skim", "Oat", "Almond", "Half and Half"] as const;

export const EXTRA_SHOT_PRICE = 1.25;

export const LUNCH_SPECIAL_HOURS = "12:00 PM to 3:00 PM, Monday to Friday";

export const ICE_MODIFIER: ModifierGroup = {
  label: "Ice",
  type: "single",
  required: true,
  options: ["Regular ice", "Light ice", "No ice"].map((label) => ({ label })),
};

export const SWEETENER_MODIFIER: ModifierGroup = {
  label: "Sweetener",
  type: "single",
  required: true,
  options: ["No sweetener", "Sugar", "Brown sugar", "Liquid sugar"].map((label) => ({ label })),
};

export const BREAKFAST_BREAD_MODIFIER: ModifierGroup = {
  label: "Bread",
  type: "single",
  required: true,
  options: ["Portuguese roll", "Croissant", "Plain bagel", "Everything bagel"].map((label) => ({ label })),
};

export const FOOD_ADD_ONS: ModifierGroup = {
  label: "Meat upgrade",
  type: "multiple",
  options: [{ label: "Extra meat", price: 2.5 }],
};

export const DECAF_MODIFIER: ModifierGroup = {
  label: "Coffee type",
  type: "single",
  required: true,
  options: [
    { label: "Regular" },
    { label: "Decaf (about twice the prep time)", price: 1 },
  ],
};

export const CHEESE_UPGRADES: ModifierGroup = {
  label: "Cheese",
  type: "multiple",
  options: [
    { label: "Swap to Swiss", price: 1 },
    { label: "Extra cheese", price: 1 },
  ],
};

export const ADD_BACON: ModifierGroup = {
  label: "Bacon",
  type: "single",
  options: [{ label: "Add bacon", price: 1 }],
};

export const EXTRA_BACON: ModifierGroup = {
  label: "Bacon",
  type: "single",
  options: [{ label: "Extra bacon", price: 1 }],
};

export const categories: MenuCategory[] = [
  "Coffee",
  "Matcha",
  "Tea",
  "Smoothies",
  "Breakfast",
  "Sandwiches",
  "Bites",
  "From the Fridge",
  "Coffee Beans",
];

export const DRINK_CATEGORIES: MenuCategory[] = ["Coffee", "Matcha", "Tea", "Smoothies"];

export const prepStationFor = (product: Pick<Product, "category" | "prepStation">): PrepStation => {
  if (product.prepStation) return product.prepStation;
  if (DRINK_CATEGORIES.includes(product.category)) return "COFFEE";
  if (product.category === "From the Fridge" || product.category === "Coffee Beans") return "RETAIL";
  return "KITCHEN";
};

export const temperaturesForProduct = (product: Product): ("Hot" | "Iced")[] => {
  if (product.sizing) {
    const values: ("Hot" | "Iced")[] = [];
    if (product.sizing.hot?.length) values.push("Hot");
    if (product.sizing.iced?.length) values.push("Iced");
    if (values.length) return values;
  }
  return product.temps ?? ["Hot", "Iced"];
};

export const modifierGroupsForProduct = (product: Product): ModifierGroup[] => {
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isSmoothie = Boolean(product.bases?.length);
  return [
    ...(product.modifierGroups ?? []),
    ...(product.decafAvailable ? [DECAF_MODIFIER] : []),
    ...(isDrink && !isSmoothie && temperaturesForProduct(product).includes("Iced") ? [ICE_MODIFIER] : []),
    ...(isDrink && !isSmoothie && product.id !== "hot-tea" ? [SWEETENER_MODIFIER] : []),
  ];
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function priceProductSelection(product: Product, input: ProductSelection = {}): PricedSelection {
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isSmoothie = Boolean(product.bases?.length);
  const availableTemperatures = temperaturesForProduct(product);
  const temperature = input.temperature ?? (availableTemperatures.includes("Iced") ? "Iced" : availableTemperatures[0]);
  if (isDrink && (!temperature || !availableTemperatures.includes(temperature))) {
    throw new Error(`Invalid temperature for ${product.name}.`);
  }

  const sizes = temperature === "Hot" ? product.sizing?.hot ?? [] : product.sizing?.iced ?? [];
  const hasTwoSizes = ["shark-cubano", "chicken-sandwich", "emilia"].includes(product.id);
  const size = input.size ?? sizes[0]?.label ?? (hasTwoSizes ? "Regular" : "");
  if (sizes.length && !sizes.some((entry) => entry.label === size)) {
    throw new Error(`Invalid size for ${product.name}.`);
  }
  if (hasTwoSizes && !["Regular", "Large"].includes(size)) {
    throw new Error(`Invalid sandwich size for ${product.name}.`);
  }

  const hasMilkOptions = isDrink && !isSmoothie && !["chicha", "malta", "hot-tea"].includes(product.id);
  const defaultMilk = ["americano", "drip-coffee", "espresso", "cold-brew", "chicha", "malta", "red-eye", "decaf-coffee", "regular-coffee"].includes(product.id) ? "None" : "Whole";
  const milk = input.milk ?? defaultMilk;
  if (hasMilkOptions && milk !== "None" && !MILK_OPTIONS.includes(milk as (typeof MILK_OPTIONS)[number])) {
    throw new Error(`Invalid milk choice for ${product.name}.`);
  }

  const flavor = input.flavor ?? product.flavors?.[0] ?? "";
  if (product.flavors?.length && !product.flavors.includes(flavor)) {
    throw new Error(`Invalid choice for ${product.name}.`);
  }
  const base = input.base ?? product.bases?.[0] ?? "";
  if (product.bases?.length && !product.bases.includes(base)) {
    throw new Error(`Invalid smoothie base for ${product.name}.`);
  }

  const hasSyrupOptions = isDrink && !isSmoothie && product.id !== "hot-tea";
  const syrups = [...new Set(input.syrups ?? [])];
  if ((!hasSyrupOptions && syrups.length) || syrups.some((value) => !SYRUP_OPTIONS.includes(value as (typeof SYRUP_OPTIONS)[number]))) {
    throw new Error(`Invalid syrup choice for ${product.name}.`);
  }

  const hasShotOptions =
    (product.category === "Coffee" || ["matcha-latte", "strawberry-matcha", "mango-matcha", "chai-tea-latte"].includes(product.id)) &&
    product.id !== "hot-tea";
  const extraShot = input.extraShot ?? 0;
  if (!Number.isInteger(extraShot) || extraShot < 0 || extraShot > 5 || (!hasShotOptions && extraShot > 0)) {
    throw new Error(`Invalid espresso-shot quantity for ${product.name}.`);
  }

  const modifierGroups = modifierGroupsForProduct(product);
  const modifiers: Record<string, string[]> = {};
  for (const group of modifierGroups) {
    const selected = [...new Set(input.modifiers?.[group.label] ?? (group.required && group.options[0] ? [group.options[0].label] : []))];
    if ((group.required && selected.length === 0) || (group.type === "single" && selected.length > 1)) {
      throw new Error(`Choose a valid ${group.label.toLowerCase()} option for ${product.name}.`);
    }
    if (selected.some((value) => !group.options.some((option) => option.label === value))) {
      throw new Error(`Invalid ${group.label.toLowerCase()} option for ${product.name}.`);
    }
    modifiers[group.label] = selected;
  }

  const notes = (input.notes ?? "").trim();
  if (notes.length > 180) throw new Error("Special instructions must be 180 characters or fewer.");

  const chosenSize = sizes.find((entry) => entry.label === size);
  const modifierPrice = modifierGroups.reduce(
    (total, group) => total + (modifiers[group.label] ?? []).reduce(
      (sum, selected) => sum + (group.options.find((option) => option.label === selected)?.price ?? 0),
      0,
    ),
    0,
  );
  const unitPrice = roundMoney(
    (chosenSize?.price ?? product.price) +
    (hasTwoSizes && size === "Large" ? 6 : 0) +
    extraShot * EXTRA_SHOT_PRICE +
    syrups.length * SYRUP_PRICE +
    modifierPrice,
  );

  const options: string[] = [];
  if (product.flavors?.length && flavor) options.push(flavor);
  if (isDrink) {
    if (availableTemperatures.length > 1 && temperature) options.push(temperature);
    if (hasMilkOptions) options.push(milk === "None" ? "No milk" : milk);
    if (isSmoothie && base) options.push(`${base} base`);
    if (size) options.push(size);
    if (syrups.length) options.push(`Syrup: ${syrups.join(", ")}`);
  }
  if (hasTwoSizes && size) options.push(size);
  if (extraShot) options.push(extraShot === 1 ? "Extra shot" : `${extraShot} extra shots`);
  for (const group of modifierGroups) {
    for (const selected of modifiers[group.label] ?? []) options.push(`${group.label}: ${selected}`);
  }
  if (notes) options.push(notes);

  return {
    unitPrice,
    options,
    selection: { temperature, size, milk, flavor, base, extraShot, syrups, modifiers, notes },
  };
}

export const menuProducts: Product[] = [
  {
    id: "ocean-blend-bag",
    name: "Ocean Blend",
    category: "Coffee Beans",
    prepStation: "RETAIL",
    price: 19,
    description: "12 oz medium roast coffee from El Salvador.",
    popular: true,
    configurable: true,
    flavorLabel: "Grind",
    flavors: ["Whole bean", "Ground"],
    visual: "bag",
    photo: "/menu/coffee/ocean-blend-single-bag-catalog-v1.png",
    video: "/featured-ocean-blend.mp4",
  },
  {
    id: "latte",
    name: "Latte",
    category: "Coffee",
    price: 5,
    sizing: {
      hot: [{ label: "12 oz", price: 5 }, { label: "16 oz", price: 6 }],
      iced: [{ label: "16 oz", price: 6 }],
    },
    description: "Espresso with silky steamed milk, made hot or iced.",
    popular: true,
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/drink-iced-latte.webp",
    drink: "latte",
  },
  {
    id: "cortado",
    name: "Cortado",
    category: "Coffee",
    price: 3.75,
    temps: ["Hot"],
    description: "A balanced pour of espresso and warm milk.",
    popular: true,
    configurable: true,
    decafAvailable: true,
    visual: "hot",
    photo: "/cup-hot.png",
    drink: "cortado",
  },
  {
    id: "americano",
    name: "Americano",
    category: "Coffee",
    price: 3.95,
    sizing: {
      hot: [{ label: "12 oz", price: 3.95 }, { label: "16 oz", price: 4.5 }],
      iced: [{ label: "16 oz", price: 4.5 }],
    },
    description: "Espresso opened with hot water for a clean finish.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/drink-iced-americano.webp",
    drink: "americano",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "Coffee",
    price: 4.95,
    temps: ["Hot"],
    description: "Espresso, steamed milk, and a generous cap of foam.",
    configurable: true,
    decafAvailable: true,
    visual: "hot",
    photo: "/cup-hot.png",
    drink: "cappuccino",
  },
  {
    id: "espresso",
    name: "Espresso",
    category: "Coffee",
    price: 2.75,
    temps: ["Hot"],
    sizing: { hot: [{ label: "Single", price: 2.75 }, { label: "Double", price: 3.5 }] },
    description: "A concentrated shot of Deaf Shark coffee.",
    configurable: true,
    decafAvailable: true,
    visual: "hot",
    photo: "/cup-hot.png",
    drink: "espresso",
  },
  {
    id: "regular-coffee",
    name: "Regular Coffee",
    category: "Coffee",
    price: 3,
    sizing: {
      hot: [{ label: "12 oz", price: 3 }, { label: "16 oz", price: 3.95 }],
      iced: [{ label: "16 oz", price: 3.95 }],
    },
    description: "Freshly brewed and ready for the day ahead.",
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-coffee.webp",
    drink: "drip-coffee",
  },
  {
    id: "decaf-coffee",
    name: "Decaf Coffee",
    category: "Coffee",
    price: 4,
    description: "Freshly prepared decaf coffee. Please allow about twice the usual preparation time.",
    configurable: true,
    temps: ["Hot"],
    sizing: { hot: [{ label: "12 oz", price: 4 }] },
    visual: "hot",
    photo: "/cup-hot.png",
    drink: "drip-coffee",
  },
  {
    id: "red-eye",
    name: "Red Eye",
    category: "Coffee",
    price: 5.95,
    description: "Brewed coffee with a shot of espresso pulled straight into it.",
    configurable: true,
    decafAvailable: true,
    sizing: {
      hot: [{ label: "16 oz", price: 5.95 }],
      iced: [{ label: "16 oz", price: 5.95 }],
    },
    visual: "iced",
    photo: "/drink-iced-red-eye.webp",
    drink: "drip-coffee",
  },
  {
    id: "salvadoran-horchata-latte",
    name: "Salvadoran Peanut Horchata Latte",
    category: "Coffee",
    price: 6.25,
    description: "Traditional Salvadoran peanut horchata with cinnamon, topped with fresh espresso over ice.",
    popular: true,
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/drink-salvi-horchata.webp",
    drink: "horchata-latte",
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    category: "Coffee",
    price: 4.75,
    description: "Steeped cold for 18 hours. Clean, bold, and smooth with zero bitterness.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-cold-brew.webp",
    drink: "cold-brew",
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    category: "Coffee",
    price: 5.95,
    description: "Cold milk, double espresso, and rich warm caramel drizzle over ice.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/drink-caramel-macchiato.webp",
    drink: "caramel-macchiato",
  },
  {
    id: "strawberry-matcha",
    name: "Strawberry Matcha",
    category: "Matcha",
    section: "Matcha",
    price: 7.75,
    description: "Layered strawberry purée, creamy milk, and ceremonial Japanese emerald matcha over ice.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-strawberry-matcha.webp",
    video: "/featured-strawberry-matcha.mp4",
    drink: "matcha",
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    category: "Matcha",
    section: "Matcha",
    price: 6.75,
    description: "Ceremonial Japanese emerald matcha whisked with silky milk, served hot or iced.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-matcha-latte.webp",
    drink: "matcha",
  },
  {
    id: "mango-matcha",
    name: "Mango Matcha",
    category: "Matcha",
    section: "Matcha",
    price: 7.75,
    description: "Ceremonial matcha layered with mango over ice.",
    configurable: true,
    temps: ["Iced"],
    visual: "iced",
    photo: "/drink-mango-matcha.webp",
    drink: "matcha",
  },
  {
    id: "chai-tea-latte",
    name: "Chai Tea Latte",
    category: "Tea",
    section: "Tea",
    price: 4.5,
    description: "Spiced chai with steamed milk, hot or over ice.",
    configurable: true,
    sizing: {
      hot: [{ label: "12 oz", price: 4.5 }],
      iced: [{ label: "16 oz", price: 5.5 }],
    },
    visual: "iced",
    photo: "/drink-chai-latte.webp",
  },
  {
    id: "hot-tea",
    name: "Hot Tea",
    category: "Tea",
    section: "Tea",
    price: 2.75,
    description: "Brewed to order. Green tea, honey lemon, ginseng, chamomile, or mandarin orange spice.",
    configurable: true,
    temps: ["Hot"],
    sizing: { hot: [{ label: "12 oz", price: 2.75 }] },
    flavorLabel: "Tea",
    flavors: ["Green Tea", "Honey Lemon", "Ginseng", "Chamomile", "Mandarin Orange Spice"],
    visual: "hot",
    photo: "/cup-hot.png",
  },
  {
    id: "smoothie-strawberry",
    name: "Strawberry Smoothie",
    category: "Smoothies",
    section: "Smoothies",
    price: 6.95,
    description: "Blended strawberry, 16 oz.",
    configurable: true,
    temps: ["Iced"],
    bases: ["Water", "Milk"],
    visual: "iced",
    photo: "/drink-smoothie-strawberry.webp",
  },
  {
    id: "smoothie-strawberry-banana",
    name: "Strawberry Banana Smoothie",
    category: "Smoothies",
    section: "Smoothies",
    price: 6.95,
    description: "Blended strawberry and banana, 16 oz.",
    configurable: true,
    temps: ["Iced"],
    bases: ["Water", "Milk"],
    visual: "iced",
    photo: "/drink-smoothie-strawberry-banana.webp",
  },
  {
    id: "smoothie-berry-blend",
    name: "Berry Blend Smoothie",
    category: "Smoothies",
    section: "Smoothies",
    price: 6.95,
    description: "Mixed berries blended smooth, 16 oz.",
    configurable: true,
    temps: ["Iced"],
    bases: ["Water", "Milk"],
    visual: "iced",
    photo: "/drink-smoothie-berry-blend.webp",
  },
  {
    id: "smoothie-tropical-sunrise",
    name: "Tropical Sunrise Smoothie",
    category: "Smoothies",
    section: "Smoothies",
    price: 6.95,
    description: "Peach, pineapple, mango, and strawberry, 16 oz.",
    configurable: true,
    temps: ["Iced"],
    bases: ["Water", "Milk"],
    visual: "iced",
    photo: "/drink-smoothie-tropical-sunrise.webp",
  },
  {
    id: "plain-croissant-or-bagel",
    name: "Croissant or Bagel (Plain)",
    category: "Breakfast",
    price: 3.2,
    description: "Choose a plain croissant, plain bagel, or everything bagel.",
    configurable: true,
    modifierGroups: [{
      label: "Choose one",
      type: "single",
      required: true,
      options: ["Croissant", "Plain bagel", "Everything bagel"].map((label) => ({ label })),
    }],
    visual: "sandwich",
    photo: "/food-croissant-bagel-real.png",
  },
  {
    id: "bagel-with-spread",
    name: "Bagel with Cream Cheese or Jelly",
    category: "Breakfast",
    price: 3.95,
    description: "Plain or everything bagel with your choice of spread.",
    configurable: true,
    modifierGroups: [
      { label: "Bagel", type: "single", required: true, options: ["Plain bagel", "Everything bagel"].map((label) => ({ label })) },
      { label: "Spread", type: "single", required: true, options: ["Cream cheese", "Jelly"].map((label) => ({ label })) },
    ],
    visual: "sandwich",
    photo: "/food-bagel-cream-cheese-real.png",
  },
  {
    id: "maple-waffle-sandwich",
    name: "Maple Waffle Sandwich",
    category: "Breakfast",
    price: 6.25,
    description: "Maple waffle sandwich with sausage and egg.",
    configurable: true,
    modifierGroups: [ADD_BACON, FOOD_ADD_ONS],
    visual: "bite",
    photo: "/food-maple-waffle-real.png",
  },
  {
    id: "jalapeno-biscuit",
    name: "Jalapeño Biscuit",
    category: "Breakfast",
    price: 6.25,
    description: "Jalapeño biscuit with sausage, egg, and cheddar.",
    configurable: true,
    modifierGroups: [CHEESE_UPGRADES, ADD_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-jalapeno-biscuit-real-v3.png",
  },
  {
    id: "ham-and-cheese-breakfast",
    name: "Ham and Cheese",
    category: "Breakfast",
    price: 6.25,
    description: "Ham and cheese on your choice of breakfast bread.",
    configurable: true,
    modifierGroups: [BREAKFAST_BREAD_MODIFIER, CHEESE_UPGRADES, ADD_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-ham-cheese-breakfast-original-style.png",
  },
  {
    id: "egg-and-cheese-breakfast",
    name: "Egg and Cheese",
    category: "Breakfast",
    price: 6.25,
    description: "Egg and cheese on your choice of breakfast bread.",
    configurable: true,
    modifierGroups: [BREAKFAST_BREAD_MODIFIER, CHEESE_UPGRADES, ADD_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-egg-cheese-breakfast-original-style.png",
  },
  {
    id: "sausage-egg-cheese-croissant",
    name: "Sausage, Egg and Cheese Croissant",
    category: "Breakfast",
    price: 6.75,
    description: "Sausage, egg, and cheese on a flaky croissant.",
    popular: true,
    configurable: true,
    modifierGroups: [CHEESE_UPGRADES, ADD_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-breakfast-croissant-real.png",
  },
  {
    id: "classic-breakfast",
    name: "Classic Breakfast Sandwich",
    category: "Breakfast",
    price: 6.75,
    description: "Bacon, egg, and cheese, with turkey bacon available.",
    configurable: true,
    modifierGroups: [
      BREAKFAST_BREAD_MODIFIER,
      { label: "Meat", type: "single", required: true, options: ["Bacon", "Turkey bacon"].map((label) => ({ label })) },
      CHEESE_UPGRADES,
      EXTRA_BACON,
      FOOD_ADD_ONS,
    ],
    visual: "sandwich",
    photo: "/food-classic-breakfast-real.png",
  },
  {
    id: "breakfast-wrap",
    name: "Breakfast Wrap",
    category: "Breakfast",
    price: 6.75,
    description: "Bacon, egg, and cheese wrapped for an easy breakfast.",
    configurable: true,
    modifierGroups: [CHEESE_UPGRADES, EXTRA_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-breakfast-wrap-original-style.png",
  },
  {
    id: "taylor-ham-egg-cheese",
    name: "Taylor Ham, Egg and Cheese",
    category: "Breakfast",
    price: 7.25,
    description: "Taylor ham, egg, and cheese on your choice of breakfast bread.",
    configurable: true,
    modifierGroups: [BREAKFAST_BREAD_MODIFIER, CHEESE_UPGRADES, ADD_BACON, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-taylor-ham-egg-cheese-real.png",
  },
  {
    id: "lunch-special",
    name: "Lunch Special",
    category: "Sandwiches",
    price: 7,
    description: "Sandwich, soda, and chips. Served 12:00 PM to 3:00 PM, Monday to Friday.",
    popular: true,
    configurable: true,
    flavorLabel: "Choose one",
    flavors: [
      "Emilia Sandwich - mortadella, provolone, honey sauce",
      "Small Chicken Sandwich - chicken, lettuce, ham, swiss, pickles, mustard",
    ],
    visual: "sandwich",
    photo: "/food-lunch-special-coke-positioned.png",
  },
  {
    id: "shark-cubano",
    name: "The Shark Cubano",
    category: "Sandwiches",
    price: 6,
    description: "Pressed panini with pork, Swiss, ham, lettuce, pickles, and mustard.",
    popular: true,
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-shark-cubano.jpg",
  },
  {
    id: "chicken-sandwich",
    name: "Chicken Sandwich",
    category: "Sandwiches",
    price: 6,
    description: "Pressed panini with chicken, Swiss, ham, lettuce, pickles, and mustard.",
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-chicken-sandwich.jpg",
  },
  {
    id: "emilia",
    name: "Emilia",
    category: "Sandwiches",
    price: 6,
    description: "Mortadella, provolone, and honey in a pressed sandwich.",
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-emilia-real-v2.png",
  },
  {
    id: "turkey-pesto",
    name: "Turkey Pesto",
    category: "Sandwiches",
    price: 7.25,
    description: "Ciabatta, turkey pesto, Swiss, lettuce, and tomato.",
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-turkey-pesto.jpg",
  },
  {
    id: "chicken-pesto",
    name: "Chicken Pesto",
    category: "Sandwiches",
    price: 7.75,
    description: "Grilled chicken, melted cheese, tomato, and basil pesto on toasted artisan bread.",
    popular: true,
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/chicken-pesto-centered.jpg",
    video: "/featured-chicken-pesto.mp4",
  },
  {
    id: "la-toscana",
    name: "La Toscana",
    category: "Sandwiches",
    price: 9.75,
    description: "Mortadella, burrata, pesto, arugula, roasted peppers, and olive oil.",
    popular: true,
    configurable: true,
    modifierGroups: [FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/food-la-toscana-real-v2.png",
  },
  {
    id: "cachapa",
    name: "Cachapa",
    category: "Bites",
    price: 9.5,
    description: "Sweet corn pancake filled with cheese.",
    popular: true,
    configurable: true,
    visual: "bite",
    photo: "/food-cachapa.jpg",
  },
  {
    id: "tequenos",
    name: "Tequeños",
    category: "Bites",
    price: 5.99,
    description: "Four golden pastry sticks filled with cheese.",
    popular: true,
    visual: "bite",
    photo: "/food-tequenos-real.png",
  },
  {
    id: "cachitos",
    name: "Cachitos",
    category: "Bites",
    price: 6.99,
    description: "Soft pastry stuffed with ham, cheese, and bacon.",
    visual: "bite",
    photo: "/food-cachitos-croissant-style-v2.png",
  },
  {
    id: "fries",
    name: "French Fries",
    category: "Bites",
    price: 3.99,
    description: "Crisp, golden, and ready to share.",
    visual: "bite",
    photo: "/food-fries-real.png",
  },
  {
    id: "mozzarella-sticks",
    name: "Mozzarella Sticks",
    category: "Bites",
    price: 5.99,
    description: "Six golden mozzarella sticks.",
    visual: "bite",
    photo: "/food-mozzarella-sticks-real-v3.png",
  },
  {
    id: "chicken-wings-fries",
    name: "Chicken Wings with French Fries",
    category: "Bites",
    price: 7.99,
    description: "Chicken wings served with French fries.",
    configurable: true,
    visual: "bite",
    photo: "/food-chicken-wings-fries-breaded-v2.png",
  },
  {
    id: "poland-spring",
    name: "Poland Spring Water",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2,
    description: "Chilled 16.9 oz bottled spring water.",
    visual: "iced",
    photo: "/menu/fridge/poland-spring-16-9oz-catalog-v1.png",
  },
  {
    id: "smartwater",
    name: "Smartwater",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3,
    description: "Chilled 20 oz vapor-distilled water.",
    visual: "iced",
    photo: "/menu/fridge/smartwater-20oz-catalog-v1.png",
  },
  {
    id: "san-pellegrino",
    name: "S. Pellegrino",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.5,
    description: "Sparkling natural mineral water, 16.9 oz.",
    visual: "iced",
    photo: "/menu/fridge/s-pellegrino-16-9oz-catalog-v1.png",
  },
  {
    id: "canned-soda",
    name: "Canned Soda",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2,
    description: "Chilled 12 oz can. Coca-Cola, Sprite, Diet Coke, or Canada Dry Ginger Ale.",
    configurable: true,
    flavorLabel: "Choose a soda",
    flavors: ["Coca-Cola", "Sprite", "Diet Coke", "Canada Dry Ginger Ale"],
    visual: "iced",
    photo: "/menu/fridge/canned-soda-all-options-group-catalog-v1.png",
    flavorPhotos: {
      "Coca-Cola": "/menu/fridge/coca-cola-can-12oz-catalog-v1.png",
      Sprite: "/menu/fridge/sprite-can-12oz-catalog-v1.png",
      "Diet Coke": "/menu/fridge/diet-coke-can-12oz-catalog-v1.png",
      "Canada Dry Ginger Ale": "/menu/fridge/canada-dry-can-12oz-catalog-v1.png",
    },
  },
  {
    id: "vita-coco",
    name: "Vita Coco Coconut Water",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2.95,
    description: "The Original coconut water, 16.9 oz.",
    visual: "iced",
    photo: "/menu/fridge/vita-coco-original-16-9oz-catalog-v1.png",
  },
  {
    id: "tropicana-refreshers",
    name: "Tropicana Refreshers",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2.75,
    description: "Chilled Tropicana bottled drink. Lemonade or Fruit Punch.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Lemonade", "Fruit Punch"],
    visual: "iced",
    photo: "/menu/fridge/tropicana-refreshers-all-flavors-group-catalog-v1.png",
    flavorPhotos: {
      Lemonade: "/menu/fridge/tropicana-refreshers-lemonade-catalog-v1.png",
      "Fruit Punch": "/menu/fridge/tropicana-refreshers-fruit-punch-catalog-v1.png",
    },
  },
  {
    id: "tropicana-juice",
    name: "Tropicana Juice (11 oz)",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.25,
    description: "Chilled 11 oz bottle. Orange Juice, Apple Juice, or Cranberry Cocktail.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Orange Juice", "Apple Juice", "Cranberry Cocktail"],
    visual: "iced",
    photo: "/menu/fridge/tropicana-juice-11oz-all-flavors-group-catalog-v2.png",
    flavorPhotos: {
      "Orange Juice": "/menu/fridge/tropicana-orange-juice-11oz-catalog-v1.png",
      "Apple Juice": "/menu/fridge/tropicana-apple-juice-11oz-catalog-v1.png",
      "Cranberry Cocktail": "/menu/fridge/tropicana-cranberry-cocktail-11oz-catalog-v1.png",
    },
  },
  {
    id: "snapple",
    name: "Snapple",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3,
    description: "Chilled 20 oz Snapple. Peach Tea, Raspberry Tea, Lemon Tea, or Kiwi Strawberry.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Peach Tea", "Raspberry Tea", "Lemon Tea", "Kiwi Strawberry"],
    visual: "iced",
    photo: "/menu/fridge/snapple-20oz-all-flavors-group-catalog-v1.png",
    flavorPhotos: {
      "Peach Tea": "/menu/fridge/snapple-peach-tea-20oz-catalog-v1.png",
      "Raspberry Tea": "/menu/fridge/snapple-raspberry-tea-20oz-catalog-v1.png",
      "Lemon Tea": "/menu/fridge/snapple-lemon-tea-20oz-catalog-v1.png",
      "Kiwi Strawberry": "/menu/fridge/snapple-kiwi-strawberry-20oz-catalog-v1.png",
    },
  },
  {
    id: "tropicana-juice-15",
    name: "Tropicana Juice (15 oz)",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.5,
    description: "Chilled 15 oz bottle of juice. Cranberry or Apple Juice.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Cranberry", "Apple Juice"],
    visual: "iced",
    photo: "/menu/fridge/tropicana-juice-15oz-all-flavors-group-catalog-v1.png",
    flavorPhotos: {
      Cranberry: "/menu/fridge/tropicana-cranberry-juice-15oz-catalog-v1.png",
      "Apple Juice": "/menu/fridge/tropicana-apple-juice-15oz-catalog-v1.png",
    },
  },
  {
    id: "arnold-palmer",
    name: "Arnold Palmer",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.25,
    description: "Southern Style Half & Half Sweet Tea & Lemonade, 20 oz.",
    visual: "iced",
    photo: "/menu/fridge/arnold-palmer-half-and-half-20oz-catalog-v1.png",
  },
  {
    id: "gatorade",
    name: "Gatorade",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2.75,
    description: "Chilled 20 oz sports drink. Cool Blue, Lemon-Lime, or Fruit Punch.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Cool Blue", "Lemon-Lime", "Fruit Punch"],
    visual: "iced",
    photo: "/menu/fridge/gatorade-all-flavors-group-catalog-v1.png",
    flavorPhotos: {
      "Cool Blue": "/menu/fridge/gatorade-cool-blue-20oz-catalog-v1.png",
      "Lemon-Lime": "/menu/fridge/gatorade-lemon-lime-20oz-catalog-v1.png",
      "Fruit Punch": "/menu/fridge/gatorade-fruit-punch-20oz-catalog-v1.png",
    },
  },
  {
    id: "red-bull",
    name: "Red Bull",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 4,
    description: "Chilled 8.4 oz energy drink.",
    visual: "iced",
    photo: "/menu/fridge/red-bull-original-8-4oz-catalog-v1.png",
  },
  {
    id: "bottled-soda",
    name: "Bottled Soda",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.5,
    description: "Chilled 20 oz bottle. Inca Kola, Coca-Cola, or Canada Dry Ginger Ale.",
    configurable: true,
    flavorLabel: "Choose a soda",
    flavors: ["Inca Kola", "Coca-Cola", "Canada Dry Ginger Ale"],
    visual: "iced",
    photo: "/menu/fridge/bottled-soda-all-options-group-catalog-v1.png",
    flavorPhotos: {
      "Inca Kola": "/menu/fridge/inca-kola-bottle-20oz-catalog-v1.png",
      "Coca-Cola": "/menu/fridge/coca-cola-bottle-20oz-catalog-v1.png",
      "Canada Dry Ginger Ale": "/menu/fridge/canada-dry-bottle-20oz-catalog-v1.png",
    },
  },
  {
    id: "malta-bottle",
    name: "Maltín Polar",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 2.5,
    description: "Chilled 12 oz can of real brewed non-alcoholic malt.",
    visual: "iced",
    photo: "/menu/fridge/maltin-polar-12oz-catalog-v1.png",
  },
  {
    id: "el-chichero",
    name: "El Chichero Chicha",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 4.25,
    description: "Chilled traditional chicha, 330 ml (11.2 oz).",
    visual: "iced",
    photo: "/menu/fridge/el-chichero-chicha-330ml-catalog-v1.png",
  },
];

export const featuredProducts = [
  menuProducts.find((product) => product.id === "strawberry-matcha")!,
  menuProducts.find((product) => product.id === "ocean-blend-bag")!,
  menuProducts.find((product) => product.id === "chicken-pesto")!,
];
