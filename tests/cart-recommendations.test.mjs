import assert from "node:assert/strict";
import test from "node:test";
import { recommendCartAddOns } from "../app/cart-recommendations.ts";
import { menuProducts } from "../app/menu-data.ts";

test("cart recommendations exclude products already in the cart and unavailable items", () => {
  const recommendations = recommendCartAddOns(
    ["latte"],
    menuProducts,
    { "nj-classic": false },
  );
  assert.equal(recommendations.length, 3);
  assert.ok(!recommendations.some((product) => product.id === "latte"));
  assert.ok(!recommendations.some((product) => product.id === "nj-classic"));
});

test("a food cart is paired with drink suggestions from distinct categories", () => {
  const recommendations = recommendCartAddOns(["nj-classic"], menuProducts);
  assert.equal(recommendations.length, 3);
  assert.equal(new Set(recommendations.map((product) => product.category)).size, 3);
  assert.ok(recommendations.every((product) => ["Special Drinks", "Fall Season", "Coffee", "Matcha", "Tea", "Smoothies"].includes(product.category)));
});
