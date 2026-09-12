import assert from "node:assert/strict";
import test from "node:test";
import { menuProducts, priceProductSelection } from "../app/menu-data.ts";

const smoothie = menuProducts.find((product) => product.id === "smoothie-strawberry");

test("a milk-based smoothie takes the chosen milk", () => {
  const priced = priceProductSelection(smoothie, { temperature: "Iced", base: "Milk", milk: "Oat" });
  assert.ok(priced.options.includes("Oat"), "the milk must reach the ticket");
  assert.equal(priced.selection.milk, "Oat");
});

test("a milk-based smoothie defaults to whole milk", () => {
  const priced = priceProductSelection(smoothie, { temperature: "Iced", base: "Milk" });
  assert.ok(priced.options.includes("Whole"));
  assert.equal(priced.selection.milk, "Whole");
});

test("a water-based smoothie ignores any milk sent", () => {
  const priced = priceProductSelection(smoothie, { temperature: "Iced", base: "Water", milk: "Oat" });
  assert.ok(!priced.options.includes("Oat"));
  assert.equal(priced.selection.milk, undefined);
});

test("a milk-based smoothie rejects an unknown milk", () => {
  assert.throws(() => priceProductSelection(smoothie, { temperature: "Iced", base: "Milk", milk: "Goat" }), /Invalid milk choice/);
});
