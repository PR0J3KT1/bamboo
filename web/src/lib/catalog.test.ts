import { test } from "node:test";
import assert from "node:assert/strict";
import menu from "../db/seed-data/menu.json";
import { toCatalog } from "./catalog";

/* the seed menu, shaped like the database rows toCatalog reads */
const items = menu.items.map((i, n) => ({
  ...i, familyId: i.family, categoryId: i.category, shelfId: i.shelf, image: null, photoKey: i.photo, active: true, sort: n,
}));
const pairings = Object.entries(menu.pairings as Record<string, string[]>).flatMap(([subjectId, ids]) => ids.map((itemId, sort) => ({ subjectId, itemId, sort })));
const data = {
  items,
  families: menu.families.map((f) => ({ id: f.id, name: f.name, sizeLabel: f.label, leadItemId: f.lead })),
  shelves: menu.shelves,
  pairings,
  bundles: menu.bundles.map((b, n) => ({ id: b.id, name: b.name, who: b.who, photoKey: b.photo, sort: n })),
  bundleParts: menu.bundles.flatMap((b) => b.parts.map(([itemId, qty]) => ({ bundleId: b.id, itemId, qty }))),
} as unknown as Parameters<typeof toCatalog>[0];

test("an under-18's or a guest's catalog names no drink at all", () => {
  const json = JSON.stringify(toCatalog(data, false));
  const drinks = menu.items.filter((i) => i.alcohol);
  assert.ok(drinks.length > 300);
  for (const d of drinks) {
    assert.ok(!json.includes(`"${d.id}"`), `id ${d.id} leaked`);
    assert.ok(!json.includes(d.name) || menu.items.some((i) => !i.alcohol && i.name.includes(d.name)), `name ${d.name} leaked`);
  }
});

test("an adult's catalog has the bar, its shelves and its pairings", () => {
  const c = toCatalog(data, true);
  assert.ok(c.items.filter((i) => i.alcohol).length > 300);
  assert.ok(c.shelves.length >= 10);
  assert.ok(Object.keys(c.pairs).some((k) => k.startsWith("dr-")));
  assert.ok(c.bundles.length > 0);
});
