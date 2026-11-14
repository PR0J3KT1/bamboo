/* Pricing an order, with no database or framework in sight, so it can be tested on its own.
   The server action loads the rows and calls priceOrder(); the browser uses fareFor() and
   lineKey() to show the same numbers before the order is placed. */

export type OrderMode = "delivery" | "collect";

export type BasketLine = { itemId: string; option: string | null; qty: number };

export type PricedItem = {
  id: string;
  name: string;
  price: number;
  alcohol: boolean;
  active: boolean;
  options: string[] | null;
};

export type Place = { id: string; name: string; km: number };

export type PricedLine = { itemId: string; name: string; option: string | null; unitPrice: number; qty: number };

export type PricedOrder =
  | { ok: true; lines: PricedLine[]; subtotal: number; deliveryFee: number; total: number; hasAlcohol: boolean; km: number | null }
  | { ok: false; error: string };

export const MAX_QTY = 50;
export const MAX_LINES = 60;

/** Delivery fare: KES 150 up to 3 km, then KES 30 a km, rounded to the nearest 10. The same rule
    as the static site; the rider service gives the live figure when the order is handed over. */
export function fareFor(km: number): number {
  const f = km <= 3 ? 150 : 150 + (km - 3) * 30;
  return Math.round(f / 10) * 10;
}

/** One basket line per item and option. */
export function lineKey(itemId: string, option: string | null) {
  return option ? `${itemId}::${option}` : itemId;
}

/** Add up lines for the same item and option, and drop empty ones. */
export function mergeLines(lines: BasketLine[]): BasketLine[] {
  const m = new Map<string, BasketLine>();
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty <= 0) continue;
    const k = lineKey(l.itemId, l.option);
    const prev = m.get(k);
    m.set(k, prev ? { ...prev, qty: prev.qty + l.qty } : { ...l });
  }
  return [...m.values()];
}

export function priceOrder(input: {
  lines: BasketLine[];
  items: Map<string, PricedItem>;
  adult: boolean;
  mode: OrderMode;
  place: Place | null;
}): PricedOrder {
  const lines = mergeLines(input.lines);
  if (!lines.length) return { ok: false, error: "Your order is empty." };
  if (lines.length > MAX_LINES) return { ok: false, error: "That's a lot of different things. Call the lounge for an order this size." };

  const priced: PricedLine[] = [];
  let hasAlcohol = false;
  for (const l of lines) {
    const it = input.items.get(l.itemId);
    if (!it || !it.active) return { ok: false, error: `${it?.name ?? "Something in your order"} is no longer on the menu. Take it out to carry on.` };
    if (l.qty > MAX_QTY) return { ok: false, error: `${it.name}: ${MAX_QTY} at most. Call the lounge for more.` };
    if (it.alcohol) {
      if (!input.adult) return { ok: false, error: "Alcohol is only sold to signed-in accounts aged 18 or over. Take the drinks out to carry on." };
      hasAlcohol = true;
    }
    const options = it.options ?? [];
    if (options.length && (!l.option || !options.includes(l.option))) {
      return { ok: false, error: `Choose how you'd like the ${it.name}.` };
    }
    if (!options.length && l.option) return { ok: false, error: `${it.name} doesn't come in "${l.option}".` };
    priced.push({ itemId: it.id, name: it.name, option: l.option, unitPrice: it.price, qty: l.qty });
  }

  let deliveryFee = 0;
  let km: number | null = null;
  if (input.mode === "delivery") {
    if (!input.place) return { ok: false, error: "Choose where to deliver to." };
    km = input.place.km;
    deliveryFee = fareFor(km);
  }
  const subtotal = priced.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  return { ok: true, lines: priced, subtotal, deliveryFee, total: subtotal + deliveryFee, hasAlcohol, km };
}
