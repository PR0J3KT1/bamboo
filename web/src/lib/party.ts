/* The party planner, ported from the old site (bamboo-cask.html, PLAN): pick the occasion and the
   guests, and it works out the choma, the sides and the drinks from the menu, at the lounge's
   prices. Every line can be changed or swapped, and the whole party goes into the order at once.
   Under 18 (no alcohol in the catalog): food, sodas and water only. The quantities are an
   estimate; the lounge confirms big parties. Pure: the menu comes in as a list of items. */

export type PartyItem = {
  id: string;
  name: string;
  price: number;
  size: string | null;
  kind: string | null;
  shelfId: string | null;
  categoryId: string;
  familyId: string | null;
  options: string[] | null;
  alcohol: boolean;
};

export type Occasion = {
  id: string;
  name: string;
  sw: string; // the Sheng/Swahili tagline
  line: string;
  hue: string;
  icon: "cake" | "flame" | "rings" | "ball" | "tie" | "sun" | "cap" | "spark";
  guests: number;
  hours: number;
  sober: number; // percent not drinking
  crowd: Crowd;
  spirits: Spirit[];
  extras: Extra[];
  meats: Meat[];
  sides: Side[];
};

export type Crowd = "beer" | "mixed" | "spirits" | "wine";
export type Spirit = "whisky" | "vodka" | "gin" | "tequila" | "rum" | "brandy";
export type Extra = "toast" | "shots" | "energy";
export type Meat = "mbc" | "bfc" | "pk" | "hgp" | "kc" | "cw" | "wf";
export type Side = "ug" | "d1" | "kg" | "gr" | "mc" | "rc" | "pl";
export type Tier = "pocket" | "classic" | "premium";

export const OCCASIONS: Occasion[] = [
  { id: "birthday", name: "Birthday Bash", sw: "Birthday ya mbogi", line: "Cake, a toast and a night that goes long.", hue: "#B83A68", icon: "cake", guests: 25, hours: 5, sober: 15, crowd: "mixed", spirits: ["vodka", "whisky"], extras: ["toast", "shots"], meats: ["mbc", "cw"], sides: ["ug", "d1", "kg"] },
  { id: "nyama", name: "Nyama Choma", sw: "Nyama na mbogi", line: "Smoke off the grill, a long table and the beer cold.", hue: "#B4421D", icon: "flame", guests: 20, hours: 6, sober: 10, crowd: "beer", spirits: ["whisky"], extras: [], meats: ["mbc", "bfc"], sides: ["ug", "kg", "d1"] },
  { id: "ruracio", name: "Ruracio and Harusi", sw: "Sherehe ya familia", line: "Bubbles for the toast, cognac for the wazee, kienyeji for everyone.", hue: "#8E3552", icon: "rings", guests: 80, hours: 6, sober: 35, crowd: "mixed", spirits: ["whisky", "brandy"], extras: ["toast"], meats: ["mbc", "kc"], sides: ["ug", "rc", "kg"] },
  { id: "match", name: "Match Night", sw: "Kick-off saa nne", line: "Beer for the match, a vodka for half time, wings to share.", hue: "#2B6E36", icon: "ball", guests: 12, hours: 3, sober: 10, crowd: "beer", spirits: ["vodka"], extras: [], meats: ["pk", "cw"], sides: ["mc", "d1"] },
  { id: "office", name: "Office Party", sw: "End-year ya ofisi", line: "Crowd-pleasers that go the distance, and sodas for the drivers.", hue: "#1F4A80", icon: "tie", guests: 40, hours: 4, sober: 25, crowd: "mixed", spirits: ["vodka", "gin"], extras: ["toast"], meats: ["mbc", "kc"], sides: ["ug", "d1", "kg"] },
  { id: "sundowner", name: "Sundowner", sw: "Balcony, 6:40pm", line: "Gin and tonic, fish off the grill and the last of the light.", hue: "#B86A1E", icon: "sun", guests: 10, hours: 3, sober: 10, crowd: "spirits", spirits: ["gin"], extras: [], meats: ["wf", "cw"], sides: ["d1", "gr"] },
  { id: "graduation", name: "Graduation", sw: "Mtoto amemaliza!", line: "Family, photos and a toast to the graduate.", hue: "#4F3A7C", icon: "cap", guests: 30, hours: 5, sober: 35, crowd: "wine", spirits: ["whisky"], extras: ["toast"], meats: ["mbc", "kc"], sides: ["ug", "rc", "kg"] },
  { id: "newyear", name: "New Year", sw: "Mpaka asubuhi", line: "Countdown bubbles, a shots round and energy for 3am.", hue: "#8C6A1E", icon: "spark", guests: 30, hours: 10, sober: 10, crowd: "spirits", spirits: ["vodka", "tequila", "whisky"], extras: ["toast", "shots", "energy"], meats: ["mbc", "pk"], sides: ["ug", "d1", "kg"] },
];

export const CROWDS: Record<Crowd, { name: string; sw: string; split: { beer: number; wine: number; spirits: number } }> = {
  beer: { name: "Mostly beer", sw: "Baridi baridi", split: { beer: 0.65, wine: 0.15, spirits: 0.2 } },
  mixed: { name: "A bit of everything", sw: "Kidogo ya kila kitu", split: { beer: 0.4, wine: 0.25, spirits: 0.35 } },
  spirits: { name: "Spirits first", sw: "Mzinga na mixer", split: { beer: 0.2, wine: 0.2, spirits: 0.6 } },
  wine: { name: "Wine lovers", sw: "Glasi ya wine", split: { beer: 0.15, wine: 0.6, spirits: 0.25 } },
};

export const TIERS: Record<Tier, { name: string; sw: string; line: string }> = {
  pocket: { name: "Pocket-friendly", sw: "Bajeti poa", line: "The best-value bottle on each shelf." },
  classic: { name: "Classic", sw: "Zile tunajua", line: "The house favourite where the lounge has one, or a middle-of-the-shelf bottle." },
  premium: { name: "Premium", sw: "Tunaenda juu", line: "The best bottle on each shelf, up to KES 15,000." },
};

export const SPIRITS: [Spirit, string][] = [["whisky", "Whisky"], ["vodka", "Vodka"], ["gin", "Gin"], ["tequila", "Tequila"], ["rum", "Rum"], ["brandy", "Cognac and brandy"]];
export const EXTRAS: Record<Extra, [string, string]> = {
  toast: ["A toast", "Sparkling wine, a glass each for the speech"],
  shots: ["A round of shots", "Tequila, two each"],
  energy: ["Energy for late", "Red Bull for the late shift"],
};
export const MEATS: [Meat, string][] = [["mbc", "Mbuzi choma"], ["bfc", "Beef choma"], ["pk", "Pork choma"], ["hgp", "Honey-glazed pork"], ["kc", "Kienyeji chicken"], ["cw", "Chicken wings"], ["wf", "Whole fish"]];
/** Each side, and how many guests one portion feeds. */
export const SIDES: [Side, string, number][] = [["ug", "Ugali", 2], ["d1", "Chips", 3], ["kg", "Kienyeji greens", 3], ["gr", "Greens", 3], ["mc", "Masala chips", 3], ["rc", "Rice", 3], ["pl", "Plantain", 4]];
export const HOURS = [2, 3, 4, 5, 6, 8, 10];
export const STEPS = ["The occasion", "Guests", "Food and drinks", "Budget", "Your package"];
export const MIN_GUESTS = 2;
export const MAX_GUESTS = 300;
const HOUSE = ["k6", "k5", "k3", "k4", "k1", "k2"]; // the lounge's own bottles
const MIX: Partial<Record<Spirit, { re: RegExp; per: number }>> = { gin: { re: /^tonic/i, per: 2 }, vodka: { re: /^soda$/i, per: 6 }, whisky: { re: /^soda$/i, per: 6 }, rum: { re: /^soda$/i, per: 6 }, brandy: { re: /^soda$/i, per: 6 } };

export type PlanInput = { occ: string; guests: number; hours: number; sober: number; crowd: Crowd; spirits: Spirit[]; extras: Extra[]; meats: Meat[]; sides: Side[]; tier: Tier };
export type PlanLine = { slot: string; group: "food" | "bar" | "soft"; id: string; qty: number; why: string; alts: string[] };
export type Plan = { lines: PlanLine[]; drinkers: number; sober: number; poured: number; food: number; bar: number; soft: number; total: number };

export function occasion(id: string) {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}
export function fromOccasion(o: Occasion, tier: Tier = "classic"): PlanInput {
  return { occ: o.id, guests: o.guests, hours: o.hours, sober: o.sober, crowd: o.crowd, spirits: [...o.spirits], extras: [...o.extras], meats: [...o.meats], sides: [...o.sides], tier };
}
export const hoursText = (h: number) => (h >= 10 ? "till morning" : `${h} hours`);
export const perHead = (total: number, guests: number) => Math.ceil(total / Math.max(1, guests) / 10) * 10;
const kgText = (k: number) => `${k % 1 ? (Math.floor(k) ? `${Math.floor(k)}½` : "½") : String(k)} kg`;

function ml(it: PartyItem) {
  const m = /(\d+(?:\.\d+)?)\s*(ml|litre)/i.exec(it.size ?? "");
  return !m ? 0 : /ml/i.test(m[2]) ? Number(m[1]) : Math.round(Number(m[1]) * 1000);
}
/** "Chivas Regal 12, 1 litre": a drink's size is added when the name doesn't already say it. */
export function itemLabel(it: PartyItem) {
  return it.name + ((it.categoryId === "bar" || it.categoryId === "soft") && it.size && !it.name.includes(it.size) ? `, ${it.size}` : "");
}

/** The bottles the planner can reach for, per shelf, cheapest first: beer by the bottle, spirits
    and wine between 700 ml and a litre. */
export function pools(items: Map<string, PartyItem>) {
  const shelfOf = (it: PartyItem) => {
    if (it.shelfId && it.shelfId !== "house") return it.shelfId;
    const k = `${it.kind ?? ""} ${it.name}`;
    return /whisk/i.test(k) ? "whisky" : /vodka/i.test(k) ? "vodka" : /\brum\b/i.test(k) ? "rum" : /wine/i.test(k) ? "wine" : /\bgin\b/i.test(k) ? "gin" : "";
  };
  const out: Record<string, string[]> = {};
  for (const it of items.values()) {
    if (!it.alcohol || !it.price) continue;
    const sh = shelfOf(it);
    if (!sh) continue;
    const m = ml(it);
    const ok = sh === "beer" ? /bottle/i.test(it.size ?? "") && !/small/i.test(it.size ?? "") : m >= 700 && m <= 1000;
    if (ok) (out[sh] ??= []).push(it.id);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => items.get(a)!.price - items.get(b)!.price);
  return out;
}

function byTier(pool: string[] | undefined, tier: Tier, items: Map<string, PartyItem>) {
  if (!pool?.length) return null;
  if (tier === "pocket") return pool[0];
  if (tier === "premium") {
    const ok = pool.filter((id) => items.get(id)!.price <= 15000);
    return ok.length ? ok[ok.length - 1] : pool[0];
  }
  return pool.find((id) => HOUSE.includes(id)) ?? pool[Math.floor(pool.length / 2)];
}
function perBottle(it: PartyItem, shelf: string) {
  const m = ml(it) || 750;
  return shelf === "wine" ? Math.round(m / 150) : shelf === "champagne" ? Math.round(m / 125) : Math.round(m / 47);
}

export function buildPlan(I: PlanInput, items: Map<string, PartyItem>, swaps: Record<string, string> = {}, adj: Record<string, number> = {}): Plan {
  const POOL = pools(items);
  const adult = Object.keys(POOL).length > 0;
  const lines: PlanLine[] = [];
  const drinkers = adult ? Math.round(I.guests * (1 - I.sober / 100)) : 0;
  const sober = I.guests - drinkers;
  const per = 2 + Math.min(I.hours - 1, 5) + Math.max(0, I.hours - 6) * 0.5;
  const poured = Math.round(drinkers * per);
  const soft = items ? [...items.values()].filter((it) => it.categoryId === "soft") : [];
  const softFind = (re: RegExp, prefer?: RegExp) => {
    const xs = soft.filter((it) => re.test(it.name));
    if (prefer) {
      const p = xs.filter((it) => prefer.test(it.size ?? ""));
      if (p.length) return p[0].id;
    }
    return xs[0]?.id ?? null;
  };
  const add = (l: Omit<PlanLine, "alts"> & { alts?: string[] }) => {
    if (!items.has(l.id)) return null;
    const q = adj[l.slot] ?? l.qty;
    if (q > 0 || adj[l.slot] !== undefined) {
      const line = { ...l, qty: Math.max(0, q), alts: l.alts ?? [] };
      lines.push(line);
      return line;
    }
    return null;
  };
  const choose = (slot: string, pool: string[]) => (swaps[slot] && pool.includes(swaps[slot]) ? swaps[slot] : byTier(pool, I.tier, items));
  const find = (slot: string) => lines.find((l) => l.slot === slot) ?? null;

  /* from the kitchen: a share of the guests for each meat, and sides for everyone */
  const meats = I.meats.filter((m) => items.has(m === "kc" ? "kc-w" : m === "cw" ? "cw-c" : m === "wf" ? "wf" : `${m}-1`));
  const kgHead = I.hours >= 5 ? 0.4 : 0.3;
  for (const m of meats) {
    const share = I.guests / meats.length;
    const who = `${Math.round(share)} ${Math.round(share) === 1 ? "guest" : "guests"}`;
    if (m === "kc") add({ slot: "food:kc", group: "food", id: "kc-w", qty: Math.ceil(share / 4), why: `a whole bird for every 4, ${who}` });
    else if (m === "cw") add({ slot: "food:cw", group: "food", id: "cw-c", qty: Math.ceil(share / 2), why: `a portion for every 2, ${who}` });
    else if (m === "wf") add({ slot: "food:wf", group: "food", id: "wf", qty: Math.ceil(share / 2), why: `a fish for every 2, ${who}` });
    else {
      const kg = Math.max(0.5, Math.round(share * kgHead * 2) / 2);
      const whole = Math.floor(kg);
      if (whole) add({ slot: `food:${m}`, group: "food", id: `${m}-1`, qty: whole, why: `${kgText(kg)} in all, about ${kgHead * 1000} g a head for ${who}` });
      if (kg % 1) add({ slot: `food:${m}:h`, group: "food", id: `${m}-h`, qty: 1, why: whole ? `to make up the ${kgText(kg)}` : `about ${kgHead * 1000} g a head for ${who}` });
    }
  }
  for (const s of I.sides) {
    const d = SIDES.find((x) => x[0] === s);
    if (d) add({ slot: `side:${s}`, group: "food", id: s, qty: Math.max(1, Math.ceil(I.guests / d[2])), why: `one for every ${d[2]} guests` });
  }

  /* from the bar, shared out the way the crowd drinks */
  const mixers = new Map<string, { qty: number; for: string[] }>();
  const mixer = (id: string | null, n: number, why: string) => {
    if (!id || n <= 0) return;
    const m = mixers.get(id) ?? { qty: 0, for: [] };
    m.qty += n;
    if (!m.for.includes(why)) m.for.push(why);
    mixers.set(id, m);
  };
  if (adult && drinkers) {
    const split = { ...CROWDS[I.crowd].split };
    const sp = I.spirits.filter((s) => POOL[s]?.length);
    if (!sp.length) {
      const k = 1 / (split.beer + split.wine);
      split.beer *= k;
      split.wine *= k;
      split.spirits = 0;
    }
    const sd = Math.round(poured * split.spirits);
    for (const s of sp) {
      const share = Math.round(sd / sp.length);
      const id = choose(`spirit:${s}`, POOL[s]);
      if (!id || !share) continue;
      const dpb = perBottle(items.get(id)!, s);
      const n = Math.max(1, Math.ceil(share / dpb));
      const name = SPIRITS.find((x) => x[0] === s)![1].toLowerCase();
      add({ slot: `spirit:${s}`, group: "bar", id, qty: n, why: `about ${n * dpb} drinks`, alts: POOL[s] });
      const mx = MIX[s];
      if (mx) mixer(softFind(mx.re, /plastic/i), Math.ceil((adj[`spirit:${s}`] ?? n) * dpb / mx.per), `the ${name}`);
    }
    if (I.extras.includes("shots") && POOL.tequila) {
      const tq = find("spirit:tequila");
      const sid = tq ? tq.id : choose("shots", POOL.tequila)!;
      const sn = Math.max(1, Math.ceil((drinkers * 2) / Math.max(1, Math.floor((ml(items.get(sid)!) || 750) / 30))));
      if (tq && adj["spirit:tequila"] === undefined) {
        tq.qty += sn;
        tq.why += ", and a shots round";
      } else add({ slot: "shots", group: "bar", id: sid, qty: sn, why: "a round of shots, two each", alts: POOL.tequila });
    }
    if (I.extras.includes("toast") && POOL.champagne) {
      add({ slot: "bubbles", group: "bar", id: choose("bubbles", POOL.champagne)!, qty: Math.max(1, Math.ceil(drinkers / 6)), why: "a toast, a glass each", alts: POOL.champagne });
    }
    const wg = Math.round(poured * split.wine);
    if (wg && POOL.wine) {
      const wid = choose("wine", POOL.wine)!;
      const pb = perBottle(items.get(wid)!, "wine");
      const wn = Math.ceil(wg / pb);
      add({ slot: "wine", group: "bar", id: wid, qty: wn, why: `about ${wn * pb} glasses`, alts: POOL.wine });
    }
    const bb = Math.round(poured * split.beer);
    if (bb && POOL.beer) add({ slot: "beer", group: "bar", id: choose("beer", POOL.beer)!, qty: bb, why: "cold, by the bottle", alts: POOL.beer });
  }
  for (const [id, m] of mixers) add({ slot: `mix:${id}`, group: "soft", id, qty: m.qty, why: `mixer for ${m.for.join(" and ")}` });
  if (sober) {
    const soda = softFind(/^soda$/i, /plastic/i);
    if (soda) {
      const n = Math.ceil((sober * (1 + I.hours * 0.6)) / 6);
      const had = find(`mix:${soda}`);
      if (had && adj[`mix:${soda}`] === undefined) {
        had.qty += n;
        had.why += `, and sodas for ${sober} not drinking`;
      } else if (!had) add({ slot: `mix:${soda}`, group: "soft", id: soda, qty: n, why: adult ? `sodas for the ${sober} not drinking` : "sodas for everyone" });
    }
  }
  if (adult && drinkers && I.extras.includes("energy")) {
    const rb = softFind(/^red bull/i);
    if (rb) add({ slot: "energy", group: "soft", id: rb, qty: Math.ceil(drinkers / 3), why: "for the late shift" });
  }
  const water = softFind(/^drinking water/i, /large/i);
  if (water) add({ slot: "water", group: "soft", id: water, qty: Math.max(1, Math.ceil(I.guests / 4)), why: "water on every table" });

  const shown = lines.filter((l) => l.qty > 0);
  const sum = (g?: PlanLine["group"]) => shown.filter((l) => !g || l.group === g).reduce((s, l) => s + items.get(l.id)!.price * l.qty, 0);
  return { lines, drinkers, sober, poured, food: sum("food"), bar: sum("bar"), soft: sum("soft"), total: sum() };
}

/** The message to the lounge with the whole list. */
export function planText(I: PlanInput, plan: Plan, items: Map<string, PartyItem>) {
  const o = occasion(I.occ);
  const lines = plan.lines.filter((l) => l.qty > 0).map((l) => `- ${l.qty} x ${itemLabel(items.get(l.id)!)}`);
  return `Hello Bamboo Cask, I'm planning a ${o.name} for ${I.guests} guests (${hoursText(I.hours)}). From the party planner:\n${lines.join("\n")}\nTotal KES ${plan.total.toLocaleString("en-KE")}. Date: `;
}

/** How the plan sits against a budget, and what to try if it's over. */
export function budgetNote(budget: number | null, total: number, tier: Tier) {
  if (!budget) return null;
  const d = budget - total;
  if (d >= 0) return { over: false, text: `KES ${d.toLocaleString("en-KE")} under your budget.` };
  const tip = tier === "premium" ? "Classic" : tier === "classic" ? "Pocket-friendly" : "fewer hours or fewer guests";
  return { over: true, text: `KES ${(-d).toLocaleString("en-KE")} over your budget. Try ${tip}.` };
}

/* Each occasion's photo, from Pexels (the page numbers are for the credit). Two of them show a
   drink, so under-18s see the lounge's own events room and garden there instead. */
const PEXELS: Record<string, string> = { birthday: "28863293", nyama: "14887967", ruracio: "35516036", match: "36766071", office: "8555215", sundowner: "36729891", graduation: "19837484", newyear: "5970895" };
const OWN_FOR_MINORS = new Set(["office", "sundowner"]);
export function occasionPhoto(id: string, adult: boolean) {
  const key = OWN_FOR_MINORS.has(id) && !adult ? `${id}-u18` : id;
  return { src: `/party/${key}.webp`, small: `/party/${key}-sm.webp`, pexels: key === id ? `https://www.pexels.com/photo/${PEXELS[id]}/` : null };
}
