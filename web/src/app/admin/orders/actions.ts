"use server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { notifyOrder } from "@/lib/order-feed";
import { canMove, type OrderStatus } from "@/lib/order-status";
import { NotAllowed, requirePermission, type UserRow } from "@/lib/session";
import { requestRider, TumabodaError, tumabodaEnabled } from "@/lib/tumaboda";
import { needsAttention } from "@/lib/tumaboda-core";

export type OrderActionResult = { ok: true; message: string; warning?: string } | { ok: false; error: string };

const STATUSES = ["awaiting_payment", "received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;
const DONE: Record<OrderStatus, string> = {
  awaiting_payment: "Waiting for payment",
  received: "Received",
  preparing: "Accepted",
  ready: "Marked ready",
  out_for_delivery: "Handed to the rider",
  completed: "Done",
  cancelled: "Cancelled",
};

function staffName(u: UserRow) {
  return u.name || u.phoneNumber || "Staff";
}

async function guarded(fn: (me: UserRow) => Promise<OrderActionResult>): Promise<OrderActionResult> {
  try {
    return await fn(await requirePermission({ order: ["update"] }));
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
}

/** Move an order one step on, or cancel it. Marking a delivery order ready calls a rider. */
export async function moveOrder(orderId: string, toInput: string, reasonInput?: string): Promise<OrderActionResult> {
  return guarded(async (me) => {
    const to = z.enum(STATUSES).safeParse(toInput);
    if (!to.success || !z.uuid().safeParse(orderId).success) return { ok: false, error: "That isn't a step an order can take." };
    const reason = (reasonInput ?? "").trim().slice(0, 300);
    if (to.data === "cancelled" && !reason) return { ok: false, error: "Say why the order is cancelled. The customer sees it." };

    const moved = await db.transaction(async (tx) => {
      /* lock the row, so two tablets pressing at once can't both move it */
      const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update").limit(1);
      if (!o) return { error: "That order no longer exists." } as const;
      if (!canMove(o.mode, o.status, to.data)) {
        return { error: o.status === to.data ? `${o.code} is already ${DONE[to.data].toLowerCase()}.` : `${o.code} has moved on since this screen loaded. It's been refreshed.` } as const;
      }
      await tx
        .update(schema.orders)
        .set({ status: to.data, cancelReason: to.data === "cancelled" ? reason : o.cancelReason })
        .where(eq(schema.orders.id, o.id));
      await tx.insert(schema.orderEvents).values({ orderId: o.id, status: to.data, byName: staffName(me), note: to.data === "cancelled" ? reason : null });
      await audit(tx, me, "order.status", { type: "order", id: o.id }, { status: o.status }, { status: to.data, reason: reason || undefined });
      await notifyOrder(tx, o.id);
      return { order: o } as const;
    });
    if ("error" in moved) return { ok: false, error: moved.error! };
    const o = moved.order;

    let warning: string | undefined;
    if (to.data === "ready" && o.mode === "delivery" && tumabodaEnabled() && !o.tumabodaDeliveryId) {
      const r = await callRider(o.id, me);
      if (!r.ok) warning = r.error;
    }
    if (to.data === "cancelled" && o.tumabodaDeliveryId && !needsAttention(o.tumabodaStatus) && o.tumabodaStatus !== "delivered") {
      warning = `Cancel the rider for ${o.code} in the TumaBoda business app as well. It can't be cancelled from here.`;
    }
    return { ok: true, message: `${o.code}: ${DONE[to.data].toLowerCase()}`, warning };
  });
}

/** Ask TumaBoda for a rider now (or again, after a rider cancelled). */
export async function callRiderFor(orderId: string): Promise<OrderActionResult> {
  return guarded(async (me) => {
    if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "That order no longer exists." };
    return callRider(orderId, me);
  });
}

async function callRider(orderId: string, me: UserRow): Promise<OrderActionResult> {
  if (!tumabodaEnabled()) return { ok: false, error: "TumaBoda isn't set up yet (TUMABODA_API_KEY). Arrange the rider by phone." };
  const [row] = await db
    .select({ o: schema.orders, place: schema.deliveryPlaces, items: sql<number>`(select coalesce(sum(qty),0)::int from ${schema.orderLines} where ${schema.orderLines.orderId} = ${schema.orders.id})` })
    .from(schema.orders)
    .leftJoin(schema.deliveryPlaces, eq(schema.orders.placeId, schema.deliveryPlaces.id))
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!row) return { ok: false, error: "That order no longer exists." };
  const { o, place } = row;
  if (o.mode !== "delivery") return { ok: false, error: `${o.code} is for collection.` };
  if (o.status !== "preparing" && o.status !== "ready") return { ok: false, error: `${o.code} isn't waiting for a rider.` };
  if (o.tumabodaDeliveryId && !needsAttention(o.tumabodaStatus)) return { ok: true, message: `${o.code} already has a rider booked.` };
  if (!place?.lat || !place?.lng) return { ok: false, error: `${place?.name ?? "That place"} has no map position. Arrange the rider by phone.` };

  /* After a cancelled or failed delivery, a new request needs a new reference. */
  const attempt = o.tumabodaDeliveryId ? `-${Date.now().toString(36)}` : "";
  try {
    const d = await requestRider({
      code: o.code + attempt,
      customerName: o.customerName,
      phone: o.phone,
      placeName: place.name,
      directions: o.directions,
      lat: place.lat,
      lng: place.lng,
      goodsKes: o.subtotal,
      items: row.items,
      hasAlcohol: o.hasAlcohol,
    });
    await db.transaction(async (tx) => {
      await tx
        .update(schema.orders)
        .set({ tumabodaDeliveryId: d.id, tumabodaDeliveryNumber: d.deliveryNumber, tumabodaStatus: d.status, tumabodaTrackingUrl: d.trackingUrl, tumabodaError: null })
        .where(eq(schema.orders.id, o.id));
      await audit(tx, me, "order.rider", { type: "order", id: o.id }, { tumabodaDeliveryId: o.tumabodaDeliveryId }, { tumabodaDeliveryId: d.id, deliveryNumber: d.deliveryNumber });
      await notifyOrder(tx, o.id);
    });
    return { ok: true, message: `Rider requested for ${o.code}${d.deliveryNumber ? ` (TumaBoda ${d.deliveryNumber})` : ""}` };
  } catch (e) {
    const msg =
      e instanceof TumabodaError
        ? e.code === "INSUFFICIENT_BALANCE" || /balance|wallet/i.test(e.message)
          ? "The TumaBoda wallet is too low. Top it up, then call the rider again."
          : `TumaBoda: ${e.message}`
        : "Couldn't reach TumaBoda.";
    await db.update(schema.orders).set({ tumabodaError: msg }).where(eq(schema.orders.id, o.id));
    await notifyOrder(db, o.id);
    return { ok: false, error: `${msg} Arrange the rider by phone if it keeps failing.` };
  }
}
