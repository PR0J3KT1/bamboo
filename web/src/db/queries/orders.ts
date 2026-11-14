import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayInNairobi } from "@/lib/age";
import { OPEN, type OrderStatus } from "@/lib/order-status";

export type Ticket = {
  id: string;
  code: string;
  status: OrderStatus;
  mode: "delivery" | "collect";
  createdAt: string;
  customerName: string;
  place: string | null;
  note: string | null;
  hasAlcohol: boolean;
  total: number;
  paymentMethod: "mpesa" | "pay_on_delivery" | "pay_at_counter";
  paymentStatus: string;
  tumabodaStatus: string | null;
  tumabodaError: string | null;
  riderBooked: boolean;
  lines: { qty: number; name: string; option: string | null }[];
};

/** Every open order for the board, oldest first, plus how many were finished today. */
export async function getBoard(): Promise<{ tickets: Ticket[]; doneToday: number; cancelledToday: number }> {
  const since = new Date(`${todayInNairobi()}T00:00:00+03:00`);
  const [orders, [counts]] = await Promise.all([
    db
      .select({ o: schema.orders, place: schema.deliveryPlaces.name })
      .from(schema.orders)
      .leftJoin(schema.deliveryPlaces, eq(schema.orders.placeId, schema.deliveryPlaces.id))
      .where(inArray(schema.orders.status, OPEN))
      .orderBy(asc(schema.orders.createdAt))
      .limit(300),
    db
      .select({
        done: sql<number>`count(*) filter (where ${schema.orders.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${schema.orders.status} = 'cancelled')::int`,
      })
      .from(schema.orders)
      .where(and(gte(schema.orders.updatedAt, since), inArray(schema.orders.status, ["completed", "cancelled"]))),
  ]);
  const ids = orders.map((r) => r.o.id);
  const lines = ids.length
    ? await db.select().from(schema.orderLines).where(inArray(schema.orderLines.orderId, ids)).orderBy(asc(schema.orderLines.id))
    : [];
  const byOrder = new Map<string, Ticket["lines"]>();
  for (const l of lines) byOrder.set(l.orderId, [...(byOrder.get(l.orderId) ?? []), { qty: l.qty, name: l.name, option: l.option }]);

  return {
    tickets: orders.map(({ o, place }) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      mode: o.mode,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerName,
      place,
      note: o.note,
      hasAlcohol: o.hasAlcohol,
      total: o.total,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      tumabodaStatus: o.tumabodaStatus,
      tumabodaError: o.tumabodaError,
      riderBooked: !!o.tumabodaDeliveryId,
      lines: byOrder.get(o.id) ?? [],
    })),
    doneToday: counts?.done ?? 0,
    cancelledToday: counts?.cancelled ?? 0,
  };
}

/** One order with everything the detail page shows. */
export async function getOrderDetail(id: string) {
  const [row] = await db
    .select({ o: schema.orders, place: schema.deliveryPlaces, customer: { id: schema.user.id, name: schema.user.name, phone: schema.user.phoneNumber } })
    .from(schema.orders)
    .leftJoin(schema.deliveryPlaces, eq(schema.orders.placeId, schema.deliveryPlaces.id))
    .leftJoin(schema.user, eq(schema.orders.userId, schema.user.id))
    .where(eq(schema.orders.id, id))
    .limit(1);
  if (!row) return null;
  const [lines, events, previous] = await Promise.all([
    db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, id)).orderBy(asc(schema.orderLines.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, id)).orderBy(asc(schema.orderEvents.at)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(eq(schema.orders.phone, row.o.phone))
      .then((r) => r[0]?.n ?? 0),
  ]);
  return { ...row, lines, events, ordersFromPhone: previous };
}

export async function getOrderEvents(orderId: string) {
  return db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, orderId)).orderBy(desc(schema.orderEvents.at));
}
