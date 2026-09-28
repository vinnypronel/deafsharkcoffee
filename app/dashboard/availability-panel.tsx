"use client";

import { useMemo, useState } from "react";
import { categories, ingredientCatalog, menuProducts } from "../menu-data";

type Mode = "items" | "ingredients";

/* The counter's "what can we sell right now" screen. Items and ingredients
   share one store: an item's key is its product id, an ingredient's is
   `ing:<name>`. Marking an ingredient out greys that choice for customers
   ("Oat milk") or makes the item without it ("No lettuce"). */
export function AvailabilityPanel({
  availability,
  onChange,
}: {
  availability: Record<string, boolean>;
  onChange: (key: string, available: boolean) => void;
}) {
  const ingredients = useMemo(() => ingredientCatalog(), []);
  const [mode, setMode] = useState<Mode>("items");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [outOnly, setOutOnly] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const isOut = (key: string) => availability[key] === false;
  const itemsOut = menuProducts.filter((product) => isOut(product.id)).length;
  const ingredientsOut = ingredients.filter((ingredient) => isOut(ingredient.key)).length;

  const rows = mode === "items"
    ? menuProducts.map((product) => ({ key: product.id, name: product.name, group: product.category as string, detail: `$${product.price.toFixed(2)}` }))
    : ingredients.map((ingredient) => ({ key: ingredient.key, name: ingredient.name, group: ingredient.group, detail: `Used in ${ingredient.usedIn} ${ingredient.usedIn === 1 ? "item" : "items"}` }));
  const groupNames = mode === "items"
    ? categories.filter((category) => menuProducts.some((product) => product.category === category)) as string[]
    : [...new Set(ingredients.map((ingredient) => ingredient.group))];
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) =>
    (group === "All" || row.group === group) &&
    (!outOnly || isOut(row.key)) &&
    (!needle || row.name.toLowerCase().includes(needle) || row.group.toLowerCase().includes(needle)));
  const grouped = groupNames
    .map((name) => ({ name, rows: visible.filter((row) => row.group === name) }))
    .filter((section) => section.rows.length > 0);

  function switchMode(next: Mode) {
    setMode(next);
    setGroup("All");
  }

  function resetAll() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    for (const key of Object.keys(availability)) if (availability[key] === false) onChange(key, true);
  }

  return (
    <section className="menu-control-area availability-panel">
      <div className="availability-top">
        <div>
          <h1>Available today</h1>
          <p>Tap a row to mark it out or back in stock. Customers see the change within a few seconds.</p>
        </div>
        <div className="availability-summary">
          <strong>{itemsOut} {itemsOut === 1 ? "item" : "items"} and {ingredientsOut} {ingredientsOut === 1 ? "ingredient" : "ingredients"} out</strong>
          {(itemsOut > 0 || ingredientsOut > 0) && (
            <button type="button" className={`availability-reset ${confirmReset ? "confirming" : ""}`} onClick={resetAll} onBlur={() => setConfirmReset(false)}>
              {confirmReset ? "Tap again to mark everything in stock" : "Mark everything in stock"}
            </button>
          )}
        </div>
      </div>

      <div className="availability-toolbar">
        <div className="availability-mode" role="tablist" aria-label="What to manage">
          <button type="button" role="tab" aria-selected={mode === "items"} className={mode === "items" ? "active" : ""} onClick={() => switchMode("items")}>Menu items <span>{itemsOut} out</span></button>
          <button type="button" role="tab" aria-selected={mode === "ingredients"} className={mode === "ingredients" ? "active" : ""} onClick={() => switchMode("ingredients")}>Ingredients <span>{ingredientsOut} out</span></button>
        </div>
        <label className="availability-search">
          <span className="sr-only">Search</span>
          <input id="availability-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "items" ? "Search menu items" : "Search ingredients, like oat or lettuce"} />
        </label>
        <label className="availability-out-only">
          <input id="availability-out-only" type="checkbox" checked={outOnly} onChange={(event) => setOutOnly(event.target.checked)} />
          Only show what is out
        </label>
      </div>

      <div className="availability-groups" role="group" aria-label="Filter by section">
        {["All", ...groupNames].map((name) => (
          <button key={name} type="button" className={group === name ? "active" : ""} onClick={() => setGroup(name)} aria-pressed={group === name}>{name}</button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <p className="availability-empty">{outOnly ? "Nothing is marked out here." : "No matches. Try a different search."}</p>
      ) : grouped.map((section) => (
        <div className="availability-section" key={section.name}>
          <h2>{section.name}</h2>
          <div className="availability-rows">
            {section.rows.map((row) => {
              const out = isOut(row.key);
              return (
                <button
                  key={row.key}
                  type="button"
                  className={`availability-row ${out ? "is-out" : ""}`}
                  onClick={() => onChange(row.key, out)}
                  aria-pressed={out}
                  aria-label={`${row.name}, ${out ? "out, tap to mark in stock" : "in stock, tap to mark out"}`}
                >
                  <span className="availability-row-name"><strong>{row.name}</strong><small>{row.detail}</small></span>
                  <span className="availability-state">{out ? "Out" : "In stock"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
