import "server-only";
import { centsToKes } from "@/lib/tumaboda-core";

/* TumaBoda's partner API: a boda-boda rider for each delivery order, paid at the door.
   Off unless TUMABODA_API_KEY is set; without it the fare comes from fareFor() and staff move
   delivery orders along by hand. The key stays on the server. */

const BASE = (process.env.TUMABODA_BASE_URL || "https://sandboxapi.tumaboda.co.ke/api/v1/partner").replace(/\/$/, "");

export function tumabodaEnabled() {
  return !!process.env.TUMABODA_API_KEY;
}

export class TumabodaError extends Error {
  constructor(public status: number, public code: string, message: string, public body?: Record<string, unknown>) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.TUMABODA_API_KEY;
  if (!key) throw new TumabodaError(0, "NOT_CONFIGURED", "TumaBoda is not set up");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "X-API-Key": key, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new TumabodaError(0, "NETWORK", `Couldn't reach TumaBoda: ${(e as Error).message}`);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & Record<string, unknown>;
  if (!res.ok) throw new TumabodaError(res.status, json.error?.code ?? `HTTP_${res.status}`, json.error?.message ?? `TumaBoda answered ${res.status}`, json.error as Record<string, unknown>);
  return json as T;
}

/** The delivery fee the customer pays the rider at the door for this drop-off and this much food,
    in whole shillings; null if TumaBoda can't quote (the caller falls back to fareFor). */
export async function quoteDeliveryFee(dropoff: { lat: number; lng: number }, goodsKes: number): Promise<number | null> {
  if (!tumabodaEnabled() || goodsKes <= 0) return null;
  try {
    const { quote } = await call<{ quote: { goods_value_cents: number; collect_at_door_cents: number } }>("/deliveries/pod/quote", {
      method: "POST",
      body: {
        dropoff: { latitude: dropoff.lat, longitude: dropoff.lng },
        package: { size: "small" },
        pod: { goodsValueKes: String(goodsKes), deliveryFeePayer: "customer" },
      },
    });
    return centsToKes(quote.collect_at_door_cents - quote.goods_value_cents);
  } catch (e) {
    console.warn("[tumaboda] quote failed:", (e as Error).message);
    return null;
  }
}

export type TumabodaDelivery = { id: string; deliveryNumber: string | null; status: string; trackingUrl: string | null };

/** Ask TumaBoda for a rider, cash at the door. Safe to call twice: the order code is the
    reference, and a second request returns the delivery the first one made. */
export async function requestRider(o: {
  code: string;
  customerName: string;
  phone: string;
  placeName: string;
  directions: string | null;
  lat: number;
  lng: number;
  goodsKes: number;
  items: number;
  hasAlcohol: boolean;
}): Promise<TumabodaDelivery> {
  const body = {
    reference: o.code,
    recipient: {
      name: o.customerName,
      phone: o.phone,
      location: [o.directions, o.placeName].filter(Boolean).join(", "),
      locationName: o.placeName,
      latitude: o.lat,
      longitude: o.lng,
    },
    package: {
      description: `Bamboo Cask order ${o.code}, ${o.items} ${o.items === 1 ? "item" : "items"}`,
      size: "small",
      category: "food",
      notes: o.hasAlcohol ? "Contains alcohol: check the recipient's ID, 18 or over only." : undefined,
    },
    pod: { goodsValueKes: String(o.goodsKes), deliveryFeePayer: "customer" },
  };
  try {
    const { delivery } = await call<{ delivery: TumabodaDelivery }>("/deliveries/pod", { method: "POST", body });
    return delivery;
  } catch (e) {
    if (e instanceof TumabodaError && e.status === 409 && e.code === "DUPLICATE_REFERENCE") {
      const { delivery } = await call<{ delivery: TumabodaDelivery }>(`/deliveries/by-reference?reference=${encodeURIComponent(o.code)}`);
      return delivery;
    }
    throw e;
  }
}
