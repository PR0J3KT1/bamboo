import "server-only";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { dayList, type Period } from "@/lib/reports-core";

/* Sales are what the lounge keeps: items less any discount. Delivery fees go to the rider, so
   they're shown on their own. Only completed orders count as sales; cancelled ones are shown
   apart; orders still open count for neither. Days are calendar days in Nairobi time. */

const o = schema.orders;
const NAIROBI = sql`'Africa/Nairobi'`;
const inPeriod = (p: Period) => and(gte(o.createdAt, p.start), lt(o.createdAt, p.end));
const completed = (p: Period) => and(inPeriod(p), eq(o.status, "completed"));
const sales = sql<number>`coalesce(sum(${o.subtotal} - ${o.discount}), 0)::int`;

export type Totals = { sales: number; orders: number; deliveryFees: number; cancelled: number; cancelledValue: number; open: number };

export async function getTotals(p: Period): Promise<Totals> {
  const [r] = await db
    .select({
      sales: sql<number>`coalesce(sum(${o.subtotal} - ${o.discount}) filter (where ${o.status} = 'completed'), 0)::int`,
      orders: sql<number>`count(*) filter (where ${o.status} = 'completed')::int`,
      deliveryFees: sql<number>`coalesce(sum(${o.deliveryFee}) filter (where ${o.status} = 'completed'), 0)::int`,
      cancelled: sql<number>`count(*) filter (where ${o.status} = 'cancelled')::int`,
      cancelledValue: sql<number>`coalesce(sum(${o.subtotal} - ${o.discount}) filter (where ${o.status} = 'cancelled'), 0)::int`,
      open: sql<number>`count(*) filter (where ${o.status} not in ('completed', 'cancelled'))::int`,
    })
    .from(o)
    .where(inPeriod(p));
  return r;
}

export type Bucket = { key: string; sales: number; orders: number };

/** Sales for each day, or each hour when the period is one day. Empty days are included. */
export async function getSalesOverTime(p: Period): Promise<{ unit: "day" | "hour"; buckets: Bucket[] }> {
  const hourly = p.days === 1;
  const key = hourly
    ? sql<string>`to_char(${o.createdAt} at time zone ${NAIROBI}, 'HH24')`
    : sql<string>`to_char(${o.createdAt} at time zone ${NAIROBI}, 'YYYY-MM-DD')`;
  const rows = await db.select({ key, sales, orders: sql<number>`count(*)::int` }).from(o).where(completed(p)).groupBy(key);
  const got = new Map(rows.map((r) => [r.key, r]));
  if (!hourly) return { unit: "day", buckets: dayList(p).map((d) => got.get(d) ?? { key: d, sales: 0, orders: 0 }) };

  /* the hours the lounge actually sold in, widened to at least 10:00 to 23:00 */
  const hours = rows.map((r) => Number(r.key));
  const first = Math.min(10, ...hours);
  const last = Math.max(23, ...hours);
  const buckets: Bucket[] = [];
  for (let h = first; h <= last; h++) {
    const k = String(h).padStart(2, "0");
    buckets.push(got.get(k) ?? { key: k, sales: 0, orders: 0 });
  }
  return { unit: "hour", buckets };
}

export type MixKey = "kitchen" | "soft" | "bar";
export type Share = { key: string; label: string; value: number; orders?: number };

const lineValue = sql<number>`coalesce(sum(${schema.orderLines.unitPrice} * ${schema.orderLines.qty}), 0)::int`;

/** Kitchen, soft drinks and the Cask Room, by the value of the lines (before any discount). */
export async function getMix(p: Period): Promise<Share[]> {
  const i = schema.items;
  const kind = sql<MixKey>`case when ${i.alcohol} then 'bar' when ${i.shelfId} is not null then 'soft' else 'kitchen' end`;
  const rows = await db
    .select({ kind, value: lineValue })
    .from(schema.orderLines)
    .innerJoin(o, eq(schema.orderLines.orderId, o.id))
    .innerJoin(i, eq(schema.orderLines.itemId, i.id))
    .where(completed(p))
    .groupBy(kind);
  const got = new Map(rows.map((r) => [r.kind, r.value]));
  return [
    { key: "kitchen", label: "Kitchen", value: got.get("kitchen") ?? 0 },
    { key: "soft", label: "Soft drinks", value: got.get("soft") ?? 0 },
    { key: "bar", label: "Cask Room", value: got.get("bar") ?? 0 },
  ];
}

const PAYMENT: Record<string, string> = { pay_on_delivery: "Paid at the door", pay_at_counter: "Paid at the counter", mpesa: "M-Pesa online" };

export async function getPayments(p: Period): Promise<Share[]> {
  const rows = await db
    .select({ method: o.paymentMethod, value: sales, orders: sql<number>`count(*)::int` })
    .from(o)
    .where(completed(p))
    .groupBy(o.paymentMethod);
  const got = new Map(rows.map((r) => [r.method, r]));
  return (["pay_on_delivery", "pay_at_counter", "mpesa"] as const).map((m) => ({
    key: m,
    label: PAYMENT[m],
    value: got.get(m)?.value ?? 0,
    orders: got.get(m)?.orders ?? 0,
  }));
}

export type Seller = { itemId: string; name: string; section: string; qty: number; value: number };

/** Every item sold, best first by quantity. The name is the one on its latest order, with the
    bottle size added, since a whisky's sizes are separate items with the same name. */
export async function getSellers(p: Period): Promise<Seller[]> {
  const l = schema.orderLines;
  const rows = await db
    .select({
      size: schema.items.size,
      itemId: l.itemId,
      name: sql<string>`(array_agg(${l.name} order by ${o.createdAt} desc))[1]`,
      section: schema.categories.name,
      qty: sql<number>`sum(${l.qty})::int`,
      value: lineValue,
    })
    .from(l)
    .innerJoin(o, eq(l.orderId, o.id))
    .innerJoin(schema.items, eq(l.itemId, schema.items.id))
    .innerJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(completed(p))
    .groupBy(l.itemId, schema.items.size, schema.categories.name)
    .orderBy(desc(sql`sum(${l.qty})`), asc(l.itemId));
  return rows.map(({ size, ...r }) => ({ ...r, name: size && !r.name.includes(size) ? `${r.name}, ${size}` : r.name }));
}

export type Area = { key: string; name: string; orders: number; sales: number };

/** Completed orders by where they went; collections are one row. */
export async function getAreas(p: Period): Promise<Area[]> {
  const dp = schema.deliveryPlaces;
  const rows = await db
    .select({ mode: o.mode, placeId: o.placeId, name: dp.name, orders: sql<number>`count(*)::int`, sales })
    .from(o)
    .leftJoin(dp, eq(o.placeId, dp.id))
    .where(completed(p))
    .groupBy(o.mode, o.placeId, dp.name);
  return rows
    .map((r) => ({
      key: r.mode === "collect" ? "collect" : (r.placeId ?? "unknown"),
      name: r.mode === "collect" ? "Collected at the lounge" : (r.name ?? "Place not on the list"),
      orders: r.orders,
      sales: r.sales,
    }))
    .sort((a, b) => b.orders - a.orders || b.sales - a.sales);
}

export async function getCancellations(p: Period) {
  return db
    .select({ id: o.id, code: o.code, createdAt: o.createdAt, reason: o.cancelReason, value: sql<number>`(${o.subtotal} - ${o.discount})::int`, customerName: o.customerName })
    .from(o)
    .where(and(inPeriod(p), eq(o.status, "cancelled")))
    .orderBy(desc(o.createdAt))
    .limit(30);
}

/* ── for the CSV export ── */

export async function exportOrders(p: Period) {
  const dp = schema.deliveryPlaces;
  return db
    .select({
      at: o.createdAt,
      code: o.code,
      status: o.status,
      mode: o.mode,
      place: dp.name,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      discount: o.discount,
      deliveryFee: o.deliveryFee,
      total: o.total,
      cancelReason: o.cancelReason,
      items: sql<string>`(select string_agg(ol.qty || ' × ' || ol.name, '; ' order by ol.id) from order_lines ol where ol.order_id = "orders"."id")`,
    })
    .from(o)
    .leftJoin(dp, eq(o.placeId, dp.id))
    .where(inPeriod(p))
    .orderBy(asc(o.createdAt));
}

export { PAYMENT as PAYMENT_NAMES };
