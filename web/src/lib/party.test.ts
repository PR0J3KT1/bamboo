import { test } from "node:test";
import assert from "node:assert/strict";
import menu from "../db/seed-data/menu.json";
import { budgetNote, buildPlan, fromOccasion, occasion, OCCASIONS, perHead, planText, pools, type PartyItem } from "./party";

/* the real menu, as a grown-up's catalog and as an under-18's (no alcohol) */
const all: PartyItem[] = menu.items.map((i) => ({ id: i.id, name: i.name, price: i.price, size: i.size, kind: i.kind, shelfId: i.shelf, categoryId: i.category, familyId: i.family, options: i.options, alcohol: i.alcohol }));
const adult = new Map(all.map((i) => [i.id, i]));
const minor = new Map(all.filter((i) => !i.alcohol).map((i) => [i.id, i]));

test("every occasion makes a plan whose total adds up", () => {
  for (const o of OCCASIONS) {
    const p = buildPlan(fromOccasion(o), adult);
    const sum = p.lines.filter((l) => l.qty > 0).reduce((s, l) => s + adult.get(l.id)!.price * l.qty, 0);
    assert.equal(p.total, sum, o.id);
    assert.equal(p.total, p.food + p.bar + p.soft, o.id);
    assert.ok(p.food > 0 && p.bar > 0 && p.soft > 0, o.id);
    assert.equal(p.drinkers + p.sober, o.guests, o.id);
  }
});

test("a birthday for 25: meat by weight, sides by head, drinks for 21", () => {
  const p = buildPlan(fromOccasion(occasion("birthday")), adult);
  const qty = (slot: string) => p.lines.find((l) => l.slot === slot)?.qty;
  // 12.5 guests each on goat and wings; 5 hours means 400 g a head: 5 kg of goat
  assert.equal(qty("food:mbc"), 5);
  assert.equal(qty("food:mbc:h"), undefined);
  assert.equal(qty("food:cw"), 7);
  assert.equal(qty("side:ug"), 13); // one for every 2
  assert.equal(qty("side:d1"), 9); // one for every 3
  assert.equal(p.drinkers, 21);
  assert.equal(p.poured, Math.round(21 * (2 + 4)));
  assert.ok(qty("spirit:vodka")! >= 1 && qty("spirit:whisky")! >= 1 && qty("bubbles")! >= 1);
  assert.equal(qty("water"), 7);
});

test("under 18: food, sodas and water only", () => {
  for (const o of OCCASIONS) {
    const p = buildPlan(fromOccasion(o), minor);
    assert.equal(p.bar, 0, o.id);
    assert.equal(p.drinkers, 0, o.id);
    assert.ok(p.lines.every((l) => !adult.get(l.id)!.alcohol), o.id);
    assert.ok(p.lines.some((l) => /^Soda$/.test(adult.get(l.id)!.name)), o.id);
  }
});

test("tiers pick cheaper or dearer bottles, and swaps and changed numbers stick", () => {
  const I = fromOccasion(occasion("nyama"));
  const cost = (t: "pocket" | "classic" | "premium") => buildPlan({ ...I, tier: t }, adult).bar;
  assert.ok(cost("pocket") <= cost("classic") && cost("classic") <= cost("premium"));
  const pool = pools(adult).whisky;
  const swapped = buildPlan(I, adult, { "spirit:whisky": pool[pool.length - 1] });
  assert.equal(swapped.lines.find((l) => l.slot === "spirit:whisky")!.id, pool[pool.length - 1]);
  const set = buildPlan(I, adult, {}, { "side:ug": 0, beer: 3 });
  assert.equal(set.lines.find((l) => l.slot === "side:ug")!.qty, 0); // kept, at nought
  assert.equal(set.lines.find((l) => l.slot === "beer")!.qty, 3);
});

test("the list for the lounge, the price a head and the budget", () => {
  const I = fromOccasion(occasion("match"));
  const p = buildPlan(I, adult);
  const text = planText(I, p, adult);
  assert.match(text, /^Hello Bamboo Cask, I'm planning a Match Night for 12 guests \(3 hours\)\. From the party planner:\n- /);
  assert.match(text, /\nTotal KES [\d,]+\. Date: $/);
  assert.equal(perHead(12345, 12), 1030);
  assert.equal(budgetNote(null, 100, "classic"), null);
  assert.deepEqual(budgetNote(30000, 25000, "classic"), { over: false, text: "KES 5,000 under your budget." });
  assert.deepEqual(budgetNote(20000, 25000, "classic"), { over: true, text: "KES 5,000 over your budget. Try Pocket-friendly." });
});

test("the same totals as the old site's planner, to the shilling (an under-18's plan, 14 Nov 2026)", () => {
  const old: Record<string, number> = { birthday: 20900, nyama: 21500, ruracio: 78850, match: 7400, office: 36150, sundowner: 7650, graduation: 29800, newyear: 30250 };
  for (const o of OCCASIONS) assert.equal(buildPlan(fromOccasion(o), minor).total, old[o.id], o.id);
});

test("every default party fits in one order", async () => {
  const { MAX_QTY, MAX_LINES } = await import("./orders");
  for (const o of OCCASIONS) {
    const p = buildPlan(fromOccasion(o), adult);
    assert.ok(p.lines.length <= MAX_LINES, o.id);
    assert.ok(p.lines.every((l) => l.qty <= MAX_QTY), o.id);
  }
});
