"use client";
import { useSyncExternalStore } from "react";
import { lineKey, mergeLines, type BasketLine, type OrderMode } from "@/lib/orders";

/* The basket lives in this browser only: item ids, choices and quantities, never prices (the
   server prices every order from the menu). Shared by every tab of the site through the
   storage event. A new key, so a basket saved by the old static site can't leak in. */

export type BasketState = {
  lines: BasketLine[];
  mode: OrderMode;
  placeId: string | null;
  directions: string;
  note: string;
};

const KEY = "bc-app-basket";
const EMPTY: BasketState = { lines: [], mode: "delivery", placeId: null, directions: "", note: "" };

let state: BasketState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<BasketState>) };
    state = { ...state, lines: mergeLines(state.lines ?? []) };
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((l) => l());
  });
}

function save(next: BasketState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: the basket lasts for this page only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function snapshot() {
  load();
  return state;
}

export function useBasket(): BasketState {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export const basket = {
  add(itemId: string, option: string | null, qty = 1) {
    save({ ...snapshot(), lines: mergeLines([...snapshot().lines, { itemId, option, qty }]) });
  },
  setQty(itemId: string, option: string | null, qty: number) {
    const k = lineKey(itemId, option);
    const lines = snapshot().lines.map((l) => (lineKey(l.itemId, l.option) === k ? { ...l, qty } : l)).filter((l) => l.qty > 0);
    save({ ...snapshot(), lines });
  },
  remove(itemIds: string[]) {
    const drop = new Set(itemIds);
    save({ ...snapshot(), lines: snapshot().lines.filter((l) => !drop.has(l.itemId)) });
  },
  set(patch: Partial<Omit<BasketState, "lines">>) {
    save({ ...snapshot(), ...patch });
  },
  clear() {
    save({ ...snapshot(), lines: [], note: "" });
  },
};

/** Remember the orders placed in this browser, so a guest can find their tracking page again. */
const ORDERS_KEY = "bc-app-orders";
export function rememberOrder(id: string, code: string) {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as { id: string; code: string; at: number }[];
    list.unshift({ id, code, at: Date.now() });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* not essential */
  }
}
