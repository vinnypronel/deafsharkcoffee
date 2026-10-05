import type { MenuCategory, Product } from "./menu-data";

const DRINK_CATEGORIES = new Set<MenuCategory>([
  "Special Drinks",
  "Fall Season",
  "Coffee",
  "Matcha",
  "Tea",
  "Smoothies",
]);

const FOOD_CATEGORIES = new Set<MenuCategory>([
  "Breakfast",
  "Sandwiches",
  "Bites",
  "Desserts",
]);

/** Pick a small, stable set of complementary products for the current cart. */
export function recommendCartAddOns(
  cartProductIds: string[],
  products: Product[],
  availability: Record<string, boolean> = {},
  limit = 3,
) {
  const cartIds = new Set(cartProductIds);
  const cartProducts = products.filter((product) => cartIds.has(product.id));
  const hasDrink = cartProducts.some((product) => DRINK_CATEGORIES.has(product.category));
  const hasFood = cartProducts.some((product) => FOOD_CATEGORIES.has(product.category));
  const cartCategories = new Set(cartProducts.map((product) => product.category));

  const ranked = products
    .map((product, index) => {
      const complementary = (hasFood && DRINK_CATEGORIES.has(product.category))
        || (hasDrink && FOOD_CATEGORIES.has(product.category));
      const score = (complementary ? 100 : 0)
        + (product.popular ? 35 : 0)
        + (!cartCategories.has(product.category) ? 12 : 0)
        + (product.photo && !product.imageComingSoon ? 5 : 0);
      return { product, index, score };
    })
    .filter(({ product }) => !cartIds.has(product.id) && availability[product.id] !== false)
    .filter(({ product }) => product.category !== "Coffee Beans")
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const chosen: Product[] = [];
  const usedCategories = new Set<MenuCategory>();
  for (const candidate of ranked) {
    if (chosen.length >= limit) break;
    if (usedCategories.has(candidate.product.category)) continue;
    chosen.push(candidate.product);
    usedCategories.add(candidate.product.category);
  }
  for (const candidate of ranked) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(candidate.product)) chosen.push(candidate.product);
  }
  return chosen;
}
