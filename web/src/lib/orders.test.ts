import { test } from "node:test";
import assert from "node:assert/strict";
import { fareFor, mergeLines, priceOrder, type PricedItem } from "./orders";

const items = new Map<string, PricedItem>(
  [
    { id: "mbc-1", name: "Mbuzi choma, 1 kg", price: 1800, alcohol: false, active: true, options: null },
    { id: "ug", name: "Ugali", price: 100, alcohol: false, active: true, options: null },
    { id: "kc-w", name: "Kienyeji chicken, whole", price: 2500, alcohol: false, active: true, options: ["Dry fry", "Wet fry"] },
    { id: "k6", name: "Chivas Regal 12, 1 litre", price: 8000, alcohol: true, active: true, options: null },
    { id: "hmp-1", name: "Beef hump, 1 kg", price: 1200, alcohol: false, active: false, options: null },
  ].map((i) => [i.id, i]),
);
const parklands = { id: "parklands", name: "Parklands", km: 1.4 };

test("delivery fare: 150 up to 3 km, then 30 a km, rounded to 10", () => {
  assert.equal(fareFor(1), 150);
  assert.equal(fareFor(3), 150);
  assert.equal(fareFor(5.7), 230);
  assert.equal(fareFor(6), 240);
});

test("prices come from the menu, not the basket", () => {
  const r = priceOrder({ lines: [{ itemId: "mbc-1", option: null, qty: 1 }, { itemId: "ug", option: null, qty: 2 }], items, adult: false, mode: "delivery", place: parklands });
  assert.ok(r.ok);
  assert.equal(r.subtotal, 2000);
  assert.equal(r.deliveryFee, 150);
  assert.equal(r.total, 2150);
  assert.equal(r.lines[0].unitPrice, 1800);
});

test("the same item twice becomes one line", () => {
  assert.deepEqual(mergeLines([{ itemId: "ug", option: null, qty: 1 }, { itemId: "ug", option: null, qty: 2 }, { itemId: "mbc-1", option: null, qty: 0 }]), [{ itemId: "ug", option: null, qty: 3 }]);
});

test("alcohol is refused unless the account is an adult", () => {
  const lines = [{ itemId: "k6", option: null, qty: 1 }];
  const minor = priceOrder({ lines, items, adult: false, mode: "collect", place: null });
  assert.equal(minor.ok, false);
  const adult = priceOrder({ lines, items, adult: true, mode: "collect", place: null });
  assert.ok(adult.ok);
  assert.equal(adult.hasAlcohol, true);
  assert.equal(adult.deliveryFee, 0);
});

test("a sold-out or unknown item is refused", () => {
  assert.equal(priceOrder({ lines: [{ itemId: "hmp-1", option: null, qty: 1 }], items, adult: true, mode: "collect", place: null }).ok, false);
  assert.equal(priceOrder({ lines: [{ itemId: "nope", option: null, qty: 1 }], items, adult: true, mode: "collect", place: null }).ok, false);
});

test("a dish with choices needs one of them", () => {
  assert.equal(priceOrder({ lines: [{ itemId: "kc-w", option: null, qty: 1 }], items, adult: false, mode: "collect", place: null }).ok, false);
  assert.equal(priceOrder({ lines: [{ itemId: "kc-w", option: "Boiled", qty: 1 }], items, adult: false, mode: "collect", place: null }).ok, false);
  assert.ok(priceOrder({ lines: [{ itemId: "kc-w", option: "Wet fry", qty: 1 }], items, adult: false, mode: "collect", place: null }).ok);
});

test("delivery needs a place; quantities are capped", () => {
  assert.equal(priceOrder({ lines: [{ itemId: "ug", option: null, qty: 1 }], items, adult: false, mode: "delivery", place: null }).ok, false);
  assert.equal(priceOrder({ lines: [{ itemId: "ug", option: null, qty: 51 }], items, adult: false, mode: "collect", place: null }).ok, false);
  assert.equal(priceOrder({ lines: [], items, adult: false, mode: "collect", place: null }).ok, false);
});
