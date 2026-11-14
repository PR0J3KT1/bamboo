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

/** The same for bookings: a guest can find the booking's page again from this browser. */
const BOOKINGS_KEY = "bc-app-bookings";
export function rememberBooking(id: string, code: string) {
  try {
    const list = JSON.parse(localStorage.getItem(BOOKINGS_KEY) ?? "[]") as { id: string; code: string; at: number }[];
    list.unshift({ id, code, at: Date.now() });
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* not essential */
  }
}

/* ── a game reward won on this phone, applied at checkout ── */
const REWARD_KEY = "bc-app-reward";
export type SavedReward = { code: string; percent: number; expires: string };
const rewardListeners = new Set<() => void>();
function rewardRaw() {
  try {
    return localStorage.getItem(REWARD_KEY) ?? "";
  } catch {
    return "";
  }
}
export const reward = {
  get(raw: string): SavedReward | null {
    try {
      const r = raw ? (JSON.parse(raw) as SavedReward) : null;
      return r && r.code && new Date(r.expires) > new Date() ? r : null;
    } catch {
      return null;
    }
  },
  set(r: SavedReward | null) {
    try {
      if (r) localStorage.setItem(REWARD_KEY, JSON.stringify(r));
      else localStorage.removeItem(REWARD_KEY);
    } catch {
      /* private mode */
    }
    rewardListeners.forEach((l) => l());
  },
};
export function useReward(): SavedReward | null {
  const raw = useSyncExternalStore(
    (cb) => {
      rewardListeners.add(cb);
      return () => rewardListeners.delete(cb);
    },
    rewardRaw,
    () => "",
  );
  return reward.get(raw);
}
