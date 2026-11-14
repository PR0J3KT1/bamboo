"use server";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getViewer, isPhoneBlocked } from "@/lib/session";
import { BLOCKED_MESSAGE } from "@/lib/blocked";
import { normalizeKenyanPhone } from "@/lib/phone";
import { MAX_LINES, MAX_QTY, priceOrder, type PricedItem } from "@/lib/orders";

const Input = z.object({
  lines: z
    .array(z.object({ itemId: z.string().min(1).max(80), option: z.string().max(60).nullable(), qty: z.number().int().min(1).max(MAX_QTY) }))
    .min(1)
    .max(MAX_LINES),
  mode: z.enum(["delivery", "collect"]),
  placeId: z.string().max(60).nullable(),
  directions: z.string().trim().max(300).nullable(),
  note: z.string().trim().max(300).nullable(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().max(20),
});

export type PlaceOrderInput = z.input<typeof Input>;
export type PlaceOrderResult = { ok: true; id: string; code: string } | { ok: false; error: string };

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

  const phone = normalizeKenyanPhone(input.phone);
  if (!phone) return { ok: false, error: "Enter a Kenyan mobile number, like 0712 345 678, so the rider can call." };

  const [viewer, blocked] = await Promise.all([getViewer(), isPhoneBlocked(phone)]);
  if (blocked) return { ok: false, error: BLOCKED_MESSAGE };

  const ids = [...new Set(input.lines.map((l) => l.itemId))];
  const [rows, place] = await Promise.all([
    db
      .select({ id: schema.items.id, name: schema.items.name, price: schema.items.price, alcohol: schema.items.alcohol, active: schema.items.active, options: schema.items.options })
      .from(schema.items)
      .where(inArray(schema.items.id, ids)),
    input.mode === "delivery" && input.placeId
      ? db.select().from(schema.deliveryPlaces).where(eq(schema.deliveryPlaces.id, input.placeId)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const priced = priceOrder({
    lines: input.lines,
    items: new Map<string, PricedItem>(rows.map((r) => [r.id, r])),
    adult: viewer.adult,
    mode: input.mode,
    place: place,
  });
  if (!priced.ok) return priced;

  const order = await db.transaction(async (tx) => {
    const [{ n }] = await tx.execute<{ n: string }>(sql`select nextval('order_code_seq')::text as n`);
    const [o] = await tx
      .insert(schema.orders)
      .values({
        code: `BC-${n}`,
        userId: viewer.user?.id ?? null,
        mode: input.mode,
        status: "received",
        customerName: input.name,
        phone,
        placeId: input.mode === "delivery" ? place!.id : null,
        deliveryKm: priced.km,
        directions: input.mode === "delivery" ? input.directions || null : null,
        note: input.note || null,
        hasAlcohol: priced.hasAlcohol,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        discount: 0,
        total: priced.total,
        paymentMethod: input.mode === "delivery" ? "pay_on_delivery" : "pay_at_counter",
        paymentStatus: "unpaid",
      })
      .returning({ id: schema.orders.id, code: schema.orders.code });
    await tx.insert(schema.orderLines).values(priced.lines.map((l) => ({ orderId: o.id, ...l })));
    /* The orders board listens for this; Postgres delivers it when the transaction commits. */
    await tx.execute(sql`select pg_notify('orders', ${o.id})`);
    return o;
  });

  return { ok: true, id: order.id, code: order.code };
}
