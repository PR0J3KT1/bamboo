"use server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getViewer, isPhoneBlocked } from "@/lib/session";
import { BLOCKED_MESSAGE } from "@/lib/blocked";
import { normalizeKenyanPhone } from "@/lib/phone";
import { fareFor, foodSubtotal, MAX_LINES, MAX_QTY, orderLimit, priceOrder, rewardDiscount, type PricedItem } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { notifyOrder } from "@/lib/order-feed";
import { quoteDeliveryFee } from "@/lib/tumaboda";
import { getSettings } from "@/lib/settings";
import { mpesaEnabled } from "@/lib/mpesa";
import { requestPayment, switchToCash } from "@/lib/payments";
import { cookies, headers } from "next/headers";
import { getOpenLocations, LOCATION_COOKIE, type Location } from "@/lib/locations";
import { nearest, roadKm } from "@/lib/locations-core";

/** The location that delivers to a place: the nearest one taking orders. */
async function deliveringLocation(place: { lat: number | null; lng: number | null }): Promise<Location | null> {
  const open = (await getOpenLocations()).filter((l) => l.orderingOpen);
  if (place.lat == null || place.lng == null) return open[0] ?? null;
  return nearest(open, { lat: place.lat, lng: place.lng });
}

/** This site's address as the customer reached it (for Daraja's callback). */
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
}

const UUID = z.uuid();

/** From the tracking page (its address is the order's random id): send the prompt again. */
export async function payAgain(orderId: string) {
  if (!UUID.safeParse(orderId).success) return { ok: false as const, error: "That order no longer exists." };
  return requestPayment(orderId, await siteOrigin());
}

/** From the tracking page: give up on M-Pesa and pay on delivery or at the counter instead. */
export async function payInCashInstead(orderId: string) {
  if (!UUID.safeParse(orderId).success) return { ok: false as const, error: "That order no longer exists." };
  const ok = await switchToCash(orderId);
  return ok ? { ok: true as const } : { ok: false as const, error: "This order isn't waiting for a payment any more." };
}

const Input = z.object({
  lines: z
    .array(z.object({ itemId: z.string().min(1).max(80), option: z.string().max(60).nullable(), qty: z.number().int().min(1).max(MAX_QTY) }))
    .min(1)
    .max(MAX_LINES),
  mode: z.enum(["delivery", "collect"]),
  /* the location whose menu the customer ordered from */
  locationId: z.string().min(1).max(60),
  placeId: z.string().max(60).nullable(),
  directions: z.string().trim().max(300).nullable(),
  note: z.string().trim().max(300).nullable(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().max(20),
  rewardCode: z.string().trim().toUpperCase().max(20).nullable().optional(),
  /* "mpesa": a PIN prompt now, and the kitchen starts once it's paid; otherwise pay on the spot */
  pay: z.enum(["mpesa", "cash"]).optional(),
});

export type PlaceOrderInput = z.input<typeof Input>;
export type PlaceOrderResult =
  | { ok: true; id: string; code: string }
  /* moved: the order comes from another location (the nearest), with its own prices; the
     checkout switches to it and asks the customer to look again */
  | { ok: false; error: string; moved?: { id: string; name: string } };

/* Places an order. Nothing the browser sends is trusted: every price comes from the menu in the
   database, sold-out items are refused, alcohol is refused unless the signed-in account is 18 or
   over, and the delivery fee comes from the chosen place. */
export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "name") return { ok: false, error: "Enter the name of the person receiving the order." };
    return { ok: false, error: "Something in the order didn't look right. Refresh the page and try again." };
  }
  const input = parsed.data;

  const settings = await getSettings();
  if (!settings.ordering.open) {
    return { ok: false, error: settings.ordering.note || "The kitchen isn't taking orders online just now. Call or WhatsApp the lounge." };
  }

  /* where it comes from: a delivery from the nearest location taking orders, a collection from
     the one the customer chose */
  const place =
    input.mode === "delivery" && input.placeId
      ? ((await db.select().from(schema.deliveryPlaces).where(eq(schema.deliveryPlaces.id, input.placeId)).limit(1))[0] ?? null)
      : null;
  if (input.mode === "delivery" && !place) return { ok: false, error: "Choose where we're delivering to." };
  const location = place ? await deliveringLocation(place) : (await getOpenLocations()).find((l) => l.id === input.locationId) ?? null;
  if (!location) return { ok: false, error: "That lounge isn't taking orders online just now. Call or WhatsApp us." };
  if (!location.orderingOpen) return { ok: false, error: `Bamboo Cask ${location.name} isn't taking orders online just now. Call or WhatsApp the lounge.` };
  if (location.id !== input.locationId) {
    (await cookies()).set(LOCATION_COOKIE, location.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return { ok: false, error: `Bamboo Cask ${location.name} is nearest, so your order comes from there. Check the prices, then place it.`, moved: { id: location.id, name: location.name } };
  }

  const byMpesa = input.pay === "mpesa";
  if (byMpesa && !mpesaEnabled()) return { ok: false, error: "M-Pesa isn't set up yet. Pay on delivery or at the counter." };
  const phone = normalizeKenyanPhone(input.phone);
  if (!phone) return { ok: false, error: "Enter a Kenyan mobile number, like 0712 345 678, so the rider can call." };

  const [viewer, blocked] = await Promise.all([getViewer(), isPhoneBlocked(phone)]);
  if (blocked) return { ok: false, error: BLOCKED_MESSAGE };
  /* staff ordering for walk-ins aren't limited; everyone else is, per number */
  if (!viewer.user || !can(viewer.user.role, { order: ["update"] })) {
    const [{ open, day }] = await db
      .select({
        open: sql<number>`count(*) filter (where ${schema.orders.createdAt} > now() - interval '1 hour' and ${schema.orders.status} in ('awaiting_payment', 'received', 'preparing', 'ready', 'out_for_delivery'))::int`,
        day: sql<number>`count(*) filter (where ${schema.orders.createdAt} > now() - interval '1 day')::int`,
      })
      .from(schema.orders)
      .where(eq(schema.orders.phone, phone));
    const limit = orderLimit(open, day);
    if (limit) return { ok: false, error: limit };
  }

  const ids = [...new Set(input.lines.map((l) => l.itemId))];
  /* this location's price for each item; an item it doesn't sell counts as sold out */
  const rows = await db
    .select({ id: schema.items.id, name: schema.items.name, price: schema.locationItems.price, alcohol: schema.items.alcohol, active: sql<boolean>`${schema.items.active} and ${schema.locationItems.active}`, options: schema.items.options, categoryId: schema.items.categoryId })
    .from(schema.items)
    .innerJoin(schema.locationItems, and(eq(schema.locationItems.itemId, schema.items.id), eq(schema.locationItems.locationId, location.id)))
    .where(inArray(schema.items.id, ids));

  const itemMap = new Map<string, PricedItem>(rows.map((r) => [r.id, r]));
  const priced = priceOrder({
    lines: input.lines,
    items: itemMap,
    adult: viewer.adult,
    mode: input.mode,
    place: place && place.lat != null && place.lng != null ? { ...place, km: roadKm(location, { lat: place.lat, lng: place.lng }) } : place,
  });
  if (!priced.ok) return priced;

  /* The delivery fee: TumaBoda's quote for this drop-off when it's set up, else the fare rule. */
  if (input.mode === "delivery" && place?.lat != null && place.lng != null) {
    const quoted = await quoteDeliveryFee({ lat: place.lat, lng: place.lng }, priced.subtotal, location.tumabodaLocationId);
    if (quoted != null) {
      priced.deliveryFee = quoted;
      priced.total = priced.subtotal + quoted;
    }
  }

  const order = await db.transaction(async (tx) => {
    /* a game reward: checked and used up inside the order's transaction, so it can't go twice */
    let discount = 0;
    let reward: string | null = null;
    if (input.rewardCode) {
      const [r] = await tx.select().from(schema.rewardCodes).where(eq(schema.rewardCodes.code, input.rewardCode)).for("update").limit(1);
      if (!r || r.usedAt || r.expiresAt < new Date()) return { error: !r ? "That game code isn't one of ours. Take it off to carry on." : r.usedAt ? "That game code has been used already. Take it off to carry on." : "That game code has expired. Take it off to carry on." } as const;
      discount = rewardDiscount(foodSubtotal(priced.lines, itemMap), r.percent);
      reward = r.code;
    }
    const [{ n }] = await tx.execute<{ n: string }>(sql`select nextval('order_code_seq')::text as n`);
    const [o] = await tx
      .insert(schema.orders)
      .values({
        code: `BC-${n}`,
        locationId: location.id,
        userId: viewer.user?.id ?? null,
        mode: input.mode,
        status: byMpesa ? "awaiting_payment" : "received",
        customerName: input.name,
        phone,
        placeId: input.mode === "delivery" ? place!.id : null,
        deliveryKm: priced.km,
        directions: input.mode === "delivery" ? input.directions || null : null,
        note: input.note || null,
        hasAlcohol: priced.hasAlcohol,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        discount,
        total: priced.total - discount,
        paymentMethod: byMpesa ? "mpesa" : input.mode === "delivery" ? "pay_on_delivery" : "pay_at_counter",
        paymentStatus: byMpesa ? "pending" : "unpaid",
      })
      .returning({ id: schema.orders.id, code: schema.orders.code });
    await tx.insert(schema.orderLines).values(priced.lines.map((l) => ({ orderId: o.id, ...l })));
    if (reward) await tx.update(schema.rewardCodes).set({ usedAt: new Date(), orderId: o.id }).where(eq(schema.rewardCodes.code, reward));
    await tx.insert(schema.orderEvents).values({ orderId: o.id, status: byMpesa ? "awaiting_payment" : "received", byName: "Customer" });
    /* the orders board hears about it when the transaction commits */
    await notifyOrder(tx, o.id);
    return o;
  });
  if ("error" in order) return { ok: false, error: order.error! };
  /* the PIN prompt goes out once the order is saved; if it fails, the tracking page offers a
     retry or paying in cash */
  if (byMpesa) await requestPayment(order.id, await siteOrigin());

  return { ok: true, id: order.id, code: order.code };
}

/** The delivery fee to show at checkout for a place and this much food, and which location
    delivers there (the nearest taking orders). */
export async function deliveryFee(placeId: string, subtotal: number): Promise<{ fee: number; quoted: boolean; location: { id: string; name: string } } | null> {
  if (typeof placeId !== "string" || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10_000_000) return null;
  const [place] = await db.select().from(schema.deliveryPlaces).where(eq(schema.deliveryPlaces.id, placeId)).limit(1);
  if (!place) return null;
  const location = await deliveringLocation(place);
  if (!location) return null;
  const at = { id: location.id, name: location.name };
  const quoted = place.lat != null && place.lng != null ? await quoteDeliveryFee({ lat: place.lat, lng: place.lng }, Math.round(subtotal), location.tumabodaLocationId) : null;
  if (quoted != null) return { fee: quoted, quoted: true, location: at };
  const km = place.lat != null && place.lng != null ? roadKm(location, { lat: place.lat, lng: place.lng }) : place.km;
  return { fee: fareFor(km), quoted: false, location: at };
}

/** The customer picked a location (or checkout moved them to the nearest): remember it, so the
    menu shows its prices. */
export async function chooseLocation(id: string) {
  if (typeof id !== "string") return { ok: false as const };
  const loc = (await getOpenLocations()).find((l) => l.id === id);
  if (!loc) return { ok: false as const };
  (await cookies()).set(LOCATION_COOKIE, loc.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true as const };
}
