import assert from "node:assert/strict";
import test from "node:test";
import {
  hasMilkOptionsForProduct,
  hasSyrupOptionsForProduct,
  menuProducts,
  priceProductSelection,
  temperaturesForProduct,
} from "../app/menu-data.ts";

const byId = (id) => menuProducts.find((product) => product.id === id);

test("special drinks are orderable at the advertised price", () => {
  for (const id of [
    "pistachio-latte",
    "peanut-horchata-latte",
    "coconut-matcha-refresher",
    "coconut-caramel-latte",
  ]) {
    const product = byId(id);
    assert.ok(product, `${id} should be on the menu`);
    assert.equal(product.category, "Special Drinks");
    assert.equal(product.price, 7.5);
    assert.equal(priceProductSelection(product).unitPrice, 7.5);
  }

  const frappe = byId("oreo-frappe");
  assert.ok(frappe, "oreo-frappe should be on the menu");
  assert.equal(frappe.category, "Special Drinks");
  assert.equal(frappe.price, 6.75);
  assert.equal(priceProductSelection(frappe).unitPrice, 6.75);
});

test("special drink serving options match the shop sign", () => {
  assert.deepEqual(temperaturesForProduct(byId("pistachio-latte")), ["Hot", "Iced"]);
  assert.deepEqual(temperaturesForProduct(byId("coconut-caramel-latte")), ["Hot", "Iced"]);
  assert.deepEqual(temperaturesForProduct(byId("coconut-matcha-refresher")), ["Iced"]);
});

test("the coconut matcha refresher does not offer unrelated milk or syrup customization", () => {
  const refresher = byId("coconut-matcha-refresher");
  assert.equal(hasMilkOptionsForProduct(refresher), false);
  assert.equal(hasSyrupOptionsForProduct(refresher), false);
});

test("the coconut caramel latte uses its dedicated generated menu image", () => {
  assert.equal(byId("coconut-caramel-latte").photo, "/menu/specials/coconut-caramel-latte-v1.png");
});

test("the Oreo frappe uses its generated image and offers only its removal options", () => {
  const frappe = byId("oreo-frappe");
  assert.equal(frappe.photo, "/menu/specials/oreo-frappe-v1.png");
  assert.deepEqual(temperaturesForProduct(frappe), ["Iced"]);
  assert.deepEqual(frappe.modifierGroups, [{
    label: "Remove ingredients",
    type: "multiple",
    stacked: true,
    options: [{ label: "No chocolate syrup" }, { label: "No whipped cream" }, { label: "No Oreo crumbles" }],
  }]);
  assert.equal(hasMilkOptionsForProduct(frappe), true);
  assert.equal(hasSyrupOptionsForProduct(frappe), false);
});
