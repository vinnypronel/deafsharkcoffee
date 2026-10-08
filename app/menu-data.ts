export type MenuCategory =
  | "Special Drinks"
  | "Fall Season"
  | "Coffee"
  | "Matcha"
  | "Tea"
  | "Smoothies"
  | "Breakfast"
  | "Sandwiches"
  | "Bites"
  | "Desserts"
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
  /* Lays the choices out one per row instead of side by side. */
  stacked?: boolean;
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
  /* Use a text placeholder instead of borrowing another product's photo. */
  imageComingSoon?: boolean;
  /* Optional package photo for each retail flavor. The storefront swaps these
     in the configurator while preserving `photo` as the menu-card default. */
  flavorPhotos?: Record<string, string>;
  /* Optional photos for choices stored in modifier groups rather than the
     product's top-level flavor selector (for example the fries choice). */
  modifierPhotos?: Record<string, string>;
  /* Optional configurator photos keyed by the selected serving temperature. */
  temperaturePhotos?: Partial<Record<"Hot" | "Iced", string>>;
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
export const MAX_EXTRA_SHOTS = 4;

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

export const NO_FRENCH_FRIES: ModifierGroup = {
  label: "Side",
  type: "single",
  options: [{ label: "No French fries" }],
};

export const FRIES_CHOICE: ModifierGroup = {
  label: "Fries choice",
  type: "single",
  required: true,
  options: ["Regular fries", "Sweet potato fries"].map((label) => ({ label })),
};

export const DECAF_MODIFIER: ModifierGroup = {
  label: "Coffee type",
  type: "single",
  required: true,
  options: [
    { label: "Regular" },
    { label: "Decaf (2x prep time)", price: 1 },
  ],
};

const cheeseChoice = (defaultLabel = "Yellow American"): ModifierGroup => ({
  label: "Cheese choice",
  type: "single",
  required: true,
  options: [
    { label: defaultLabel },
    { label: "Swiss", price: 1 },
    { label: "Provolone", price: 1 },
    { label: "Pepper Jack", price: 1 },
  ],
});

export const CHEESE_CHOICE = cheeseChoice();

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

export const REMOVE_BACON: ModifierGroup = {
  label: "Bacon",
  type: "single",
  options: [{ label: "No bacon" }],
};

export const REMOVE_BLT_INGREDIENTS: ModifierGroup = {
  label: "Remove ingredients",
  type: "multiple",
  options: ["No turkey bacon", "No lettuce", "No tomato", "No mayo"].map((label) => ({ label })),
};

const removeIngredients = (...ingredients: string[]): ModifierGroup => ({
  label: "Remove ingredients",
  type: "multiple",
  options: ingredients.map((ingredient) => ({ label: `No ${ingredient}` })),
});

export const categories: MenuCategory[] = [
  "Special Drinks",
  "Fall Season",
  "Coffee",
  "Matcha",
  "Tea",
  "Smoothies",
  "Breakfast",
  "Sandwiches",
  "Bites",
  "Desserts",
  "From the Fridge",
  "Coffee Beans",
];

export const DRINK_CATEGORIES: MenuCategory[] = ["Special Drinks", "Fall Season", "Coffee", "Matcha", "Tea", "Smoothies"];

export const hasMilkOptionsForProduct = (product: Product) =>
  DRINK_CATEGORIES.includes(product.category) &&
  !product.bases?.length &&
  !["chicha", "malta", "hot-tea", "dirty-soda", "coconut-matcha-refresher"].includes(product.id);

export const hasSyrupOptionsForProduct = (product: Product) =>
  DRINK_CATEGORIES.includes(product.category) &&
  !product.bases?.length &&
  !["hot-tea", "dirty-soda", "coconut-matcha-refresher", "oreo-frappe"].includes(product.id);

export const hasExtraShotOptionsForProduct = (product: Product) =>
  (product.category === "Coffee" || [
    "matcha-latte",
    "strawberry-matcha",
    "mango-matcha",
    "chai-tea-latte",
    "pumpkin-spice-latte",
    "brown-sugar-shaken-espresso",
    "iced-toasted-marshmallow-latte",
    "pistachio-latte",
    "peanut-horchata-latte",
    "coconut-caramel-latte",
  ].includes(product.id)) && product.id !== "hot-tea";

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

export const defaultTemperatureForProduct = (product: Product): "Hot" | "Iced" => {
  const availableTemperatures = temperaturesForProduct(product);
  const preferredTemperature = availableTemperatures.includes("Iced") ? "Iced" : availableTemperatures[0];
  const sizesForTemperature = (temperature: "Hot" | "Iced") =>
    temperature === "Hot" ? product.sizing?.hot ?? [] : product.sizing?.iced ?? [];

  if (preferredTemperature && sizesForTemperature(preferredTemperature).some((size) => size.price === product.price)) {
    return preferredTemperature;
  }

  return availableTemperatures.find((temperature) =>
    sizesForTemperature(temperature).some((size) => size.price === product.price),
  ) ?? preferredTemperature ?? "Hot";
};

export const defaultSizeForProduct = (product: Product, temperature: "Hot" | "Iced") => {
  const sizes = temperature === "Hot" ? product.sizing?.hot ?? [] : product.sizing?.iced ?? [];
  return sizes.find((size) => size.price === product.price)?.label ?? sizes[0]?.label ?? "";
};

/* `temperature` is the currently selected one. A hot drink has no ice level, so
   the group is withheld rather than printing "Regular ice" on a hot ticket. */
export const modifierGroupsForProduct = (product: Product, temperature?: "Hot" | "Iced"): ModifierGroup[] => {
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isSmoothie = Boolean(product.bases?.length);
  const isBlendedFrappe = product.id === "oreo-frappe";
  const servedIced = temperaturesForProduct(product).includes("Iced") && temperature !== "Hot";
  return [
    ...(product.modifierGroups ?? []),
    ...(product.decafAvailable ? [DECAF_MODIFIER] : []),
    ...(isDrink && !isSmoothie && !isBlendedFrappe && servedIced ? [ICE_MODIFIER] : []),
    ...(isDrink && !isSmoothie && !isBlendedFrappe && !["hot-tea", "dirty-soda"].includes(product.id) ? [SWEETENER_MODIFIER] : []),
  ];
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/* `out` holds the ingredient keys staff marked out today (see ingredientKey).
   A chosen option that needs one is refused; a "No X" removal whose X is out
   is added automatically, so the ticket says the item is made without it. */
export function priceProductSelection(product: Product, input: ProductSelection = {}, out: ReadonlySet<string> = NO_INGREDIENTS_OUT): PricedSelection {
  const isOut = (optionLabel: string) => {
    const ingredient = ingredientForOption(optionLabel);
    return Boolean(ingredient && out.has(ingredientKey(ingredient.name)));
  };
  const refuseIfOut = (optionLabel: string) => {
    if (isOut(optionLabel)) throw new Error(`${ingredientForOption(optionLabel)!.name} is out today. Please choose something else for ${product.name}.`);
  };
  const isDrink = DRINK_CATEGORIES.includes(product.category);
  const isSmoothie = Boolean(product.bases?.length);
  const availableTemperatures = temperaturesForProduct(product);
  const temperature = input.temperature ?? defaultTemperatureForProduct(product);
  if (isDrink && (!temperature || !availableTemperatures.includes(temperature))) {
    throw new Error(`Invalid temperature for ${product.name}.`);
  }

  const sizes = temperature === "Hot" ? product.sizing?.hot ?? [] : product.sizing?.iced ?? [];
  const hasTwoSizes = false;
  const size = input.size ?? (defaultSizeForProduct(product, temperature) || (hasTwoSizes ? "Regular" : ""));
  if (sizes.length && !sizes.some((entry) => entry.label === size)) {
    throw new Error(`Invalid size for ${product.name}.`);
  }
  if (hasTwoSizes && !["Regular", "Large"].includes(size)) {
    throw new Error(`Invalid sandwich size for ${product.name}.`);
  }

  const hasMilkOptions = hasMilkOptionsForProduct(product);
  const defaultMilk = ["americano", "drip-coffee", "espresso", "cold-brew", "chicha", "malta", "dirty-soda", "red-eye", "decaf-coffee", "regular-coffee"].includes(product.id) ? "None" : "Whole";
  const milk = input.milk ?? defaultMilk;
  if (hasMilkOptions && milk !== "None" && !MILK_OPTIONS.includes(milk as (typeof MILK_OPTIONS)[number])) {
    throw new Error(`Invalid milk choice for ${product.name}.`);
  }
  if (hasMilkOptions && milk !== "None") refuseIfOut(milk);

  const flavor = input.flavor ?? product.flavors?.[0] ?? "";
  if (product.flavors?.length && !product.flavors.includes(flavor)) {
    throw new Error(`Invalid choice for ${product.name}.`);
  }
  if (product.flavors?.length && product.category !== "Coffee Beans") refuseIfOut(flavor);
  const base = input.base ?? product.bases?.[0] ?? "";
  if (product.bases?.length && !product.bases.includes(base)) {
    throw new Error(`Invalid smoothie base for ${product.name}.`);
  }
  /* A smoothie blended with milk takes a milk choice like any other drink. With
     water there is no milk, so any milk sent alongside is ignored. */
  const smoothieUsesMilk = isSmoothie && base === "Milk";
  const smoothieMilk = smoothieUsesMilk ? (input.milk && input.milk !== "None" ? input.milk : "Whole") : "";
  if (smoothieUsesMilk && !MILK_OPTIONS.includes(smoothieMilk as (typeof MILK_OPTIONS)[number])) {
    throw new Error(`Invalid milk choice for ${product.name}.`);
  }
  if (smoothieUsesMilk) refuseIfOut(smoothieMilk);

  const hasSyrupOptions = hasSyrupOptionsForProduct(product);
  const syrups = [...new Set(input.syrups ?? [])];
  if ((!hasSyrupOptions && syrups.length) || syrups.some((value) => !SYRUP_OPTIONS.includes(value as (typeof SYRUP_OPTIONS)[number]))) {
    throw new Error(`Invalid syrup choice for ${product.name}.`);
  }
  syrups.forEach(refuseIfOut);

  const hasShotOptions = hasExtraShotOptionsForProduct(product);
  const extraShot = input.extraShot ?? 0;
  if (!Number.isInteger(extraShot) || extraShot < 0 || extraShot > MAX_EXTRA_SHOTS || (!hasShotOptions && extraShot > 0)) {
    throw new Error(`Invalid espresso-shot quantity for ${product.name}.`);
  }

  const modifierGroups = modifierGroupsForProduct(product, temperature);
  const modifiers: Record<string, string[]> = {};
  for (const group of modifierGroups) {
    const firstAvailable = group.options.find((option) => !isOut(option.label)) ?? group.options[0];
    const selected = [...new Set(input.modifiers?.[group.label] ?? (group.required && firstAvailable ? [firstAvailable.label] : []))];
    for (const option of group.options) {
      if (ingredientForOption(option.label)?.removal && isOut(option.label) && !selected.includes(option.label)) {
        if (group.type === "single") selected.splice(0, selected.length);
        selected.push(option.label);
      }
    }
    if ((group.required && selected.length === 0) || (group.type === "single" && selected.length > 1)) {
      throw new Error(`Choose a valid ${group.label.toLowerCase()} option for ${product.name}.`);
    }
    if (selected.some((value) => !group.options.some((option) => option.label === value))) {
      throw new Error(`Invalid ${group.label.toLowerCase()} option for ${product.name}.`);
    }
    selected.filter((value) => !ingredientForOption(value)?.removal).forEach(refuseIfOut);
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
    if (smoothieMilk) options.push(smoothieMilk);
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
    selection: {
      temperature: isDrink ? temperature : undefined,
      size: isDrink || hasTwoSizes ? size : undefined,
      milk: isDrink ? (isSmoothie ? (smoothieMilk || undefined) : milk) : undefined,
      flavor,
      base: isDrink ? base : undefined,
      extraShot: isDrink ? extraShot : undefined,
      syrups: isDrink ? syrups : undefined,
      modifiers,
      notes,
    },
  };
}

const catalogProducts: Product[] = [
  {
    id: "pistachio-latte",
    name: "Pistachio Latte",
    category: "Special Drinks",
    price: 7.5,
    description: "Double espresso and pistachio cream topped with vanilla cold foam and crushed pistachios.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    imageComingSoon: true,
    drink: "latte",
  },
  {
    id: "peanut-horchata-latte",
    name: "Peanut Horchata Latte",
    category: "Special Drinks",
    price: 7.5,
    description: "Double espresso with peanut-based horchata and your choice of milk.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    imageComingSoon: true,
    drink: "horchata-latte",
  },
  {
    id: "coconut-matcha-refresher",
    name: "Coconut Matcha Refresher",
    category: "Special Drinks",
    price: 7.5,
    description: "Refreshing coconut water topped with vanilla matcha cold foam and a light dusting of matcha powder.",
    configurable: true,
    temps: ["Iced"],
    visual: "iced",
    imageComingSoon: true,
    drink: "matcha",
  },
  {
    id: "coconut-caramel-latte",
    name: "Coconut Caramel Latte",
    category: "Special Drinks",
    price: 7.5,
    description: "Double espresso with coconut and caramel syrup, coconut cold foam, and toasted coconut flakes.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/menu/specials/coconut-caramel-latte-v1.png",
    drink: "latte",
  },
  {
    id: "oreo-frappe",
    name: "Oreo Frappe",
    category: "Special Drinks",
    price: 6.75,
    description: "A creamy cookies-and-cream frappe with chocolate syrup, whipped cream, and Oreo crumbles.",
    configurable: true,
    temps: ["Iced"],
    visual: "iced",
    photo: "/menu/specials/oreo-frappe-v1.png",
    modifierGroups: [{ ...removeIngredients("chocolate syrup", "whipped cream", "Oreo crumbles"), stacked: true }],
  },
  {
    id: "pumpkin-spice-latte",
    name: "Pumpkin Spice Latte",
    category: "Fall Season",
    price: 6.5,
    description: "Espresso and milk with pumpkin spice and a warm cinnamon finish.",
    configurable: true,
    decafAvailable: true,
    visual: "iced",
    photo: "/menu/seasonal/pumpkin-spice-latte-v1.png",
  },
  {
    id: "brown-sugar-shaken-espresso",
    name: "Brown Sugar Shaken Espresso",
    category: "Fall Season",
    price: 6.5,
    description: "Espresso shaken over ice with brown sugar and milk.",
    configurable: true,
    decafAvailable: true,
    temps: ["Iced"],
    visual: "iced",
    photo: "/menu/seasonal/brown-sugar-shaken-espresso-v1.png",
  },
  {
    id: "dirty-soda",
    name: "Dirty Soda",
    category: "Fall Season",
    price: 5.25,
    description: "A fizzy, creamy soda poured over ice.",
    configurable: true,
    temps: ["Iced"],
    visual: "iced",
    photo: "/menu/seasonal/dirty-soda-v1.png",
  },
  {
    id: "iced-toasted-marshmallow-latte",
    name: "Iced Toasted Marshmallow Latte",
    category: "Fall Season",
    price: 7,
    description: "Espresso and milk over ice with toasted marshmallow flavor.",
    configurable: true,
    decafAvailable: true,
    temps: ["Iced"],
    visual: "iced",
    photo: "/menu/seasonal/iced-toasted-marshmallow-latte-v1.png",
  },
  {
    id: "chocoflan",
    name: "Chocoflan",
    category: "Desserts",
    price: 7,
    description: "Chocolate cake layered with creamy caramel flan.",
    visual: "bite",
    photo: "/menu/desserts/chocoflan-v2.webp",
  },
  {
    id: "tres-leches",
    name: "Tres Leches",
    category: "Desserts",
    price: 6,
    description: "Soft sponge cake soaked in three milks and finished with cream.",
    visual: "bite",
    photo: "/menu/desserts/tres-leches-v2.webp",
  },
  {
    id: "tiramisu",
    name: "Tiramisu",
    category: "Desserts",
    price: 7,
    description: "Espresso-soaked layered dessert finished with cocoa.",
    visual: "bite",
    photo: "/menu/desserts/tiramisu-v2.webp",
  },
  {
    id: "cheesecake",
    name: "Cheesecake",
    category: "Desserts",
    price: 7,
    description: "Classic New York-style cheesecake with a graham cracker crust.",
    visual: "bite",
    photo: "/menu/desserts/cheesecake-v2.webp",
  },
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
    sizing: {
      hot: [{ label: "12 oz", price: 4 }],
      iced: [{ label: "16 oz", price: 4 }],
    },
    visual: "hot",
    photo: "/cup-hot.png",
    temperaturePhotos: {
      Hot: "/cup-hot.png",
      Iced: "/drink-iced-coffee.webp",
    },
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
    id: "nj-classic",
    name: "The NJ Classic",
    category: "Breakfast",
    price: 8,
    description: "Egg and cheese with your choice of meat, served toasted on a Kaiser roll. White bread is a free swap; croissant +$0.75.",
    popular: true,
    configurable: true,
    modifierGroups: [
      { label: "Meat", type: "single", required: true, options: ["Taylor ham", "Ham", "Bacon", "Turkey bacon", "Sausage"].map((label) => ({ label })) },
      { label: "Bread", type: "single", required: true, options: [{ label: "Kaiser roll" }, { label: "White bread" }, { label: "Croissant", price: 0.75 }] },
      { label: "Preparation", type: "single", required: true, options: [{ label: "Toasted" }, { label: "Not toasted" }] },
      CHEESE_CHOICE,
      removeIngredients("egg", "cheese"),
      FOOD_ADD_ONS,
    ],
    visual: "sandwich",
    photo: "/menu/owner/nj-classic.webp",
  },
  {
    id: "jersey-devil",
    name: "The Jersey Devil",
    category: "Breakfast",
    price: 9.75,
    description: "Egg, pepper jack, Taylor ham, bacon, jalapeño, hash browns, and chipotle mayo on a Kaiser roll.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("egg", "pepper jack", "bacon", "jalapeño", "hash browns", "chipotle mayo"), FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/jersey-devil.webp",
  },
  {
    id: "ham-cheese-croissant",
    name: "Ham and Cheese",
    category: "Breakfast",
    price: 7.25,
    description: "Ham and melted yellow American cheese on a Kaiser roll. White bread is a free swap.",
    configurable: true,
    modifierGroups: [
      { label: "Bread", type: "single", required: true, options: ["Kaiser roll", "White bread"].map((label) => ({ label })) },
      cheeseChoice("Yellow American"),
      removeIngredients("cheese"),
      FOOD_ADD_ONS,
    ],
    visual: "sandwich",
    photo: "/menu/owner/ham-cheese-croissant-v3.png",
  },
  {
    id: "french-toast",
    name: "French Toast Platter",
    category: "Breakfast",
    price: 10,
    description: "Golden French toast with three slices of bacon and one hash brown patty.",
    configurable: true,
    modifierGroups: [
      { label: "Bacon", type: "single", required: true, options: ["Bacon", "Turkey bacon"].map((label) => ({ label })) },
      removeIngredients("hash brown"),
    ],
    visual: "bite",
    photo: "/menu/owner/french-toast.webp",
  },
  {
    id: "grilled-cheese",
    name: "Grilled Cheese",
    category: "Breakfast",
    price: 8.5,
    description: "Swiss cheese, American cheese, bacon, and tomato on white bread.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("Swiss cheese", "American cheese", "bacon", "tomato"), FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/grilled-cheese.webp",
  },
  {
    id: "breakfast-wrap",
    name: "Breakfast Wrap",
    category: "Breakfast",
    price: 8.25,
    description: "Egg and cheese with your choice of ham, bacon, turkey bacon, Taylor ham, or sausage.",
    configurable: true,
    modifierGroups: [
      { label: "Meat", type: "single", required: true, options: ["Ham", "Bacon", "Turkey bacon", "Taylor ham", "Sausage", "No meat"].map((label) => ({ label })) },
      CHEESE_CHOICE,
      removeIngredients("egg", "cheese"),
      FOOD_ADD_ONS,
    ],
    visual: "sandwich",
    photo: "/menu/owner/breakfast-wrap-v2.png",
  },
  {
    id: "turkey-blt",
    name: "Turkey BLT",
    category: "Breakfast",
    price: 8.25,
    description: "Turkey bacon, lettuce, tomato, and mayo on a roll, white bread, or a wrap.",
    configurable: true,
    modifierGroups: [
      { label: "Bread", type: "single", required: true, options: ["Roll", "White bread", "Wrap"].map((label) => ({ label })) },
      REMOVE_BLT_INGREDIENTS,
      FOOD_ADD_ONS,
    ],
    visual: "sandwich",
    photo: "/menu/owner/turkey-blt.webp",
  },
  {
    id: "plain-croissant",
    name: "Croissant",
    category: "Breakfast",
    price: 3.25,
    description: "Fresh, flaky butter croissant.",
    configurable: true,
    modifierGroups: [{ label: "Spread", type: "single", options: [{ label: "Butter", price: 1 }, { label: "Jelly", price: 1 }] }],
    visual: "sandwich",
    photo: "/food-croissant-bagel-real.png",
  },
  {
    id: "tuna-sandwich",
    name: "Tuna Sandwich",
    category: "Breakfast",
    price: 8.5,
    description: "Tuna, provolone cheese, lettuce, and tomato on white bread.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("provolone cheese", "lettuce", "tomato"), FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/tuna-sandwich-v6.webp",
  },
  /* Sandwiches follow the shop's printed menu board, in its order. Every
     sandwich except the Italian Sub comes with French fries. */
  {
    id: "shark-cubano",
    name: "The Deaf Shark Cuban",
    category: "Sandwiches",
    price: 13,
    description: "Pressed panini with pork, Swiss cheese, ham, pickles, and mustard. With French fries.",
    popular: true,
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("Swiss cheese", "pickles", "mustard"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    imageComingSoon: true,
  },
  {
    id: "chicken-deluxe",
    name: "Chicken Deluxe",
    category: "Sandwiches",
    price: 13,
    description: "Crispy breaded chicken, fresh spinach, roasted peppers, fresh mozzarella, and mayonnaise. With French fries.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("spinach", "roasted peppers", "mozzarella", "mayonnaise"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/chicken-deluxe.webp",
  },
  {
    id: "chicken-pesto",
    name: "Chicken Pesto",
    category: "Sandwiches",
    price: 13,
    description: "Grilled chicken breast, fresh spinach, tomato, pesto sauce, and provolone cheese. With French fries.",
    popular: true,
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("spinach", "tomato", "pesto", "provolone cheese"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/chicken-pesto-centered.jpg",
    video: "/featured-chicken-pesto.mp4",
  },
  {
    id: "chicken-sandwich",
    name: "Grilled Chicken",
    category: "Sandwiches",
    price: 13,
    description: "Grilled chicken breast, lettuce, tomato, onion, and mayonnaise. With French fries.",
    configurable: true,
    modifierGroups: [removeIngredients("lettuce", "tomato", "onion", "mayonnaise"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/chicken-sandwich-v4.png",
  },
  {
    id: "chicken-cutlet-fuego",
    name: "Chicken Cutlet Fuego",
    category: "Sandwiches",
    price: 13,
    description: "Crispy breaded chicken, lettuce, tomato, pepper jack cheese, and chipotle mayo. With French fries.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("lettuce", "tomato", "pepper jack cheese", "chipotle mayo"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/chicken-cutlet-fuego-v1.webp",
  },
  {
    id: "tuna-wrap",
    name: "Tuna Wrap",
    category: "Sandwiches",
    price: 13,
    description: "Tuna, lettuce, tomato, onion, bacon, and Asiago cheese. With French fries.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("lettuce", "tomato", "onion", "bacon", "Asiago cheese"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    imageComingSoon: true,
  },
  {
    id: "italian",
    name: "Italian Sub",
    category: "Sandwiches",
    price: 12.5,
    description: "Provolone cheese, ham, salami, onion, lettuce, oregano, vinegar, and olive oil.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("provolone", "onion", "lettuce", "oregano", "vinegar", "oil"), FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/italian.webp",
  },
  {
    id: "garden-salad",
    name: "Garden Salad",
    category: "Bites",
    price: 13,
    description: "Lettuce, cherry tomatoes, onion, Asiago cheese, cucumber, and green olives, with chicken or tuna.",
    configurable: true,
    flavors: ["Chicken", "Tuna"],
    flavorLabel: "Choose one",
    modifierGroups: [CHEESE_CHOICE, removeIngredients("cherry tomatoes", "onion", "Asiago cheese", "cucumber", "green olives")],
    visual: "sandwich",
    imageComingSoon: true,
  },
  {
    id: "emilia",
    name: "Emilia Grilled Cheese",
    category: "Sandwiches",
    price: 12.5,
    description: "Mortadella, provolone cheese, and honey. With French fries.",
    configurable: true,
    modifierGroups: [CHEESE_CHOICE, removeIngredients("provolone cheese", "honey"), NO_FRENCH_FRIES, FOOD_ADD_ONS],
    visual: "sandwich",
    photo: "/menu/owner/emilia-grill-cheese-v3.png",
  },
  {
    id: "cachapa",
    name: "Cachapa",
    category: "Bites",
    price: 10.5,
    description: "Sweet corn pancake filled with cheese.",
    popular: true,
    configurable: true,
    modifierGroups: [CHEESE_CHOICE],
    visual: "bite",
    photo: "/menu/owner/cachapa-v5.png",
  },
  {
    id: "tequenos",
    name: "Tequeños",
    category: "Bites",
    price: 5.99,
    description: "Four golden pastry sticks filled with cheese.",
    popular: true,
    visual: "bite",
    imageComingSoon: true,
  },
  {
    id: "pupusas",
    name: "Pupusas",
    category: "Bites",
    price: 4,
    description: "Handmade griddled corn cakes with your choice of filling.",
    configurable: true,
    flavors: ["Chicken and cheese", "Cheese", "Revueltas (beans, cheese, and pork)"],
    flavorLabel: "Choose a filling",
    modifierGroups: [CHEESE_CHOICE],
    visual: "bite",
    imageComingSoon: true,
  },
  {
    id: "fries",
    name: "Regular Fries / Sweet Potato Fries",
    category: "Bites",
    price: 5,
    description: "Choose regular fries or sweet potato fries.",
    configurable: true,
    modifierGroups: [FRIES_CHOICE],
    visual: "bite",
    photo: "/menu/owner/french-fries-v8.png",
    modifierPhotos: {
      "Regular fries": "/menu/owner/french-fries-v8.png",
      "Sweet potato fries": "/menu/owner/sweet-potato-fries-v3.png",
    },
  },
  {
    id: "mozzarella-sticks",
    name: "Mozzarella Sticks",
    category: "Bites",
    price: 5.99,
    description: "Six golden mozzarella sticks.",
    visual: "bite",
    photo: "/menu/owner/mozzarella-sticks-v9.png",
  },
  {
    id: "chicken-wings-fries",
    name: "Chicken Wings with Fries",
    category: "Bites",
    price: 10,
    description: "Five breaded chicken wings served with your choice of French fries or sweet potato fries.",
    configurable: true,
    modifierGroups: [FRIES_CHOICE],
    visual: "bite",
    photo: "/menu/owner/chicken-wings-fries-v8.png",
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
    description: "The Original coconut water. Choose 11 oz or 16.9 oz.",
    configurable: true,
    modifierGroups: [{
      label: "Size",
      type: "single",
      required: true,
      options: [{ label: "11 oz" }, { label: "16.9 oz", price: 1 }],
    }],
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
    description: "Chilled 11 oz bottle. Orange Juice, Apple Juice, or Lemonade.",
    configurable: true,
    flavorLabel: "Choose a flavor",
    flavors: ["Orange Juice", "Apple Juice", "Lemonade"],
    visual: "iced",
    photo: "/menu/fridge/tropicana-juice-11oz-all-flavors-group-catalog-v3.png",
    flavorPhotos: {
      "Orange Juice": "/menu/fridge/tropicana-orange-juice-11oz-catalog-v1.png",
      "Apple Juice": "/menu/fridge/tropicana-apple-juice-11oz-catalog-v1.png",
      Lemonade: "/menu/fridge/tropicana-refreshers-lemonade-catalog-v1.png",
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
    id: "gatorade",
    name: "Gatorade",
    category: "From the Fridge",
    prepStation: "RETAIL",
    price: 3.25,
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
      photo: "/menu/fridge/bottled-soda-all-options-group-catalog-v2.png",
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

/* Within each menu section, items that have a picture come first and the ones
   still showing "Image coming soon" go last. Everything else keeps its order. */
export function picturesFirst(products: Product[]): Product[] {
  const groupStart = new Map<string, number>();
  products.forEach((product, index) => {
    const group = `${product.category}|${product.section ?? ""}`;
    if (!groupStart.has(group)) groupStart.set(group, index);
  });
  return products
    .map((product, index) => ({ product, index, start: groupStart.get(`${product.category}|${product.section ?? ""}`)! }))
    .sort((a, b) => a.start - b.start || Number(Boolean(a.product.imageComingSoon)) - Number(Boolean(b.product.imageComingSoon)) || a.index - b.index)
    .map(({ product }) => product);
}

export const menuProducts: Product[] = picturesFirst(catalogProducts);

export const featuredProducts = [
  { ...menuProducts.find((product) => product.id === "strawberry-matcha")!, featuredCategoryLabel: "Beverages" },
  { ...menuProducts.find((product) => product.id === "ocean-blend-bag")!, featuredCategoryLabel: "Coffee Beans" },
  { ...menuProducts.find((product) => product.id === "chicken-pesto")!, featuredCategoryLabel: "Sandwiches" },
];

/* Ingredients staff can mark out for the day. Each is read from a menu choice:
   "No lettuce" and "Add bacon" point at Lettuce and Bacon, milks, syrups and
   tea flavors are their own ingredient. Choices that are not ingredients
   (ice level, "No sweetener", a regular coffee) have none. */
const NOT_INGREDIENTS = new Set(["Regular ice", "Light ice", "No ice", "No sweetener", "Regular", "Extra meat", "Extra cheese", "Yellow American", "Water"]);
const INGREDIENT_ALIASES: Record<string, string> = { swiss: "Swiss cheese", provolone: "Provolone cheese", "pepper jack": "Pepper jack cheese" };

export const NO_INGREDIENTS_OUT: ReadonlySet<string> = new Set();

export function ingredientForOption(optionLabel: string): { name: string; removal: boolean } | null {
  if (!optionLabel || NOT_INGREDIENTS.has(optionLabel)) return null;
  const clean = optionLabel.replace(/\s*\(.*\)\s*$/, "").trim();
  const named = (raw: string) => {
    const alias = INGREDIENT_ALIASES[raw.toLowerCase()];
    return alias ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const removal = clean.match(/^No (.+)$/i);
  if (removal) return { name: named(removal[1]), removal: true };
  const added = clean.match(/^(?:Add|Extra|Swap to) (.+)$/i);
  if (added) return { name: named(added[1]), removal: false };
  return { name: named(clean), removal: false };
}

export function ingredientKey(name: string) {
  return `ing:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export function outIngredientsFrom(availability: Record<string, boolean> | Map<string, boolean>): Set<string> {
  const entries = availability instanceof Map ? [...availability.entries()] : Object.entries(availability);
  return new Set(entries.filter(([key, available]) => key.startsWith("ing:") && available === false).map(([key]) => key));
}

export type Ingredient = { key: string; name: string; group: string; usedIn: number };

const INGREDIENT_GROUP_ORDER = ["Milk", "Syrups", "Teas, sodas and flavors", "Breads", "Sandwich ingredients", "Sides", "Coffee", "Sweeteners"];

/** Every ingredient on the menu, grouped the way the counter thinks about them. */
export function ingredientCatalog(): Ingredient[] {
  const found = new Map<string, Ingredient & { products: Set<string> }>();
  const add = (name: string, group: string, productId: string) => {
    const key = ingredientKey(name);
    const entry = found.get(key) ?? { key, name, group, usedIn: 0, products: new Set<string>() };
    entry.products.add(productId);
    found.set(key, entry);
  };
  const groupFor = (label: string) => label === "Bread" ? "Breads" : label === "Fries choice" ? "Sides" : label === "Coffee type" ? "Coffee" : label === "Sweetener" ? "Sweeteners" : "Sandwich ingredients";
  for (const product of menuProducts) {
    if (hasMilkOptionsForProduct(product) || product.bases?.includes("Milk")) MILK_OPTIONS.forEach((milk) => add(milk, "Milk", product.id));
    if (hasSyrupOptionsForProduct(product)) SYRUP_OPTIONS.forEach((syrup) => add(syrup, "Syrups", product.id));
    if (product.flavors?.length && product.category !== "Coffee Beans") product.flavors.forEach((flavor) => add(flavor, "Teas, sodas and flavors", product.id));
    for (const group of modifierGroupsForProduct(product)) {
      for (const option of group.options) {
        const ingredient = ingredientForOption(option.label);
        if (ingredient) add(ingredient.name, groupFor(group.label), product.id);
      }
    }
  }
  return [...found.values()]
    .map(({ products, ...entry }) => ({ ...entry, usedIn: products.size }))
    .sort((a, b) => INGREDIENT_GROUP_ORDER.indexOf(a.group) - INGREDIENT_GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name));
}

