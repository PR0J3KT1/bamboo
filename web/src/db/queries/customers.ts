import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { isAdult } from "@/lib/age";
import { isBanned } from "@/lib/session";

/* A customer is a phone number: an account, or a guest who has only ordered without signing in.
   Their orders are counted by number, so an account's earlier guest orders count too. */

export type AgeStatus = "adult" | "minor" | "unfinished" | "guest";

export type CustomerRow = {
  phone: string; // E.164
  name: string | null;
  userId: string | null;
  role: string | null;
  age: AgeStatus;
  blocked: boolean;
  orders: number;
  spent: number;
  lastOrder: Date | null;
  joined: Date | null;
};

function ageOf(u: { dateOfBirth: string | null } | null): AgeStatus {
  if (!u) return "guest";
  if (!u.dateOfBirth) return "unfinished";
  return isAdult(u.dateOfBirth) ? "adult" : "minor";
}

/** Customers, most recent first, optionally matching a name or number. */
export async function listCustomers(opts: { q?: string; team?: boolean; limit?: number } = {}): Promise<CustomerRow[]> {
  const limit = opts.limit ?? 200;
  const [users, orderStats, blocked] = await Promise.all([
    db.select().from(schema.user),
    db
      .select({
        phone: schema.orders.phone,
        name: sql<string>`(array_agg(${schema.orders.customerName} order by ${schema.orders.createdAt} desc))[1]`,
        orders: sql<number>`count(*) filter (where ${schema.orders.status} <> 'cancelled')::int`,
        spent: sql<number>`coalesce(sum(${schema.orders.total}) filter (where ${schema.orders.status} = 'completed'), 0)::int`,
        last: sql<Date>`max(${schema.orders.createdAt})`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.phone),
    db.select({ phone: schema.blockedNumbers.phone }).from(schema.blockedNumbers),
  ]);
  const stats = new Map(orderStats.map((o) => [o.phone, o]));
  const blockedGuests = new Set(blocked.map((b) => b.phone));

  const rows: CustomerRow[] = [];
  const seen = new Set<string>();
  for (const u of users) {
    if (!u.phoneNumber) continue;
    seen.add(u.phoneNumber);
    const s = stats.get(u.phoneNumber);
    rows.push({
      phone: u.phoneNumber,
      name: u.dateOfBirth ? u.name : (s?.name ?? null),
      userId: u.id,
      role: u.role,
      age: ageOf(u),
      blocked: isBanned(u) || blockedGuests.has(u.phoneNumber),
      orders: s?.orders ?? 0,
      spent: s?.spent ?? 0,
      lastOrder: s?.last ? new Date(s.last) : null,
      joined: u.createdAt,
    });
  }
  for (const s of orderStats) {
    if (seen.has(s.phone)) continue;
    rows.push({ phone: s.phone, name: s.name, userId: null, role: null, age: "guest", blocked: blockedGuests.has(s.phone), orders: s.orders, spent: s.spent, lastOrder: s.last ? new Date(s.last) : null, joined: null });
  }

  const q = opts.q?.trim().toLowerCase();
  const digits = q?.replace(/\D/g, "");
  return rows
    .filter((r) => (opts.team ? r.role === "staff" || r.role === "admin" : true))
    .filter((r) => {
      if (!q) return true;
      if (r.name?.toLowerCase().includes(q)) return true;
      if (digits && digits.length >= 3) {
        const local = `0${r.phone.slice(4)}`; // 0712…
        return r.phone.includes(digits) || local.includes(digits);
      }
      return false;
    })
    .sort((a, b) => (b.lastOrder?.getTime() ?? b.joined?.getTime() ?? 0) - (a.lastOrder?.getTime() ?? a.joined?.getTime() ?? 0))
    .slice(0, limit);
}

/** One customer by number, with their orders. */
export async function getCustomer(phone: string) {
  const [[u], orders, [guestBlock]] = await Promise.all([
    db.select().from(schema.user).where(eq(schema.user.phoneNumber, phone)).limit(1),
    db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        status: schema.orders.status,
        mode: schema.orders.mode,
        total: schema.orders.total,
        createdAt: schema.orders.createdAt,
        customerName: schema.orders.customerName,
        /* table names written out: with no join, drizzle leaves columns unqualified, and "id"
           inside the subquery would mean the order line's id, not the order's */
        lines: sql<string>`(select string_agg(case when ol.qty > 1 then ol.qty || ' × ' else '' end || ol.name, ', ' order by ol.id) from order_lines ol where ol.order_id = "orders"."id")`,
      })
      .from(schema.orders)
      .where(eq(schema.orders.phone, phone))
      .orderBy(desc(schema.orders.createdAt))
      .limit(100),
    db.select().from(schema.blockedNumbers).where(eq(schema.blockedNumbers.phone, phone)).limit(1),
  ]);
  if (!u && !orders.length && !guestBlock) return null;
  const completed = orders.filter((o) => o.status === "completed");
  return {
    phone,
    user: u ?? null,
    name: u?.dateOfBirth ? u.name : (orders[0]?.customerName ?? u?.name ?? null),
    age: ageOf(u ?? null),
    blocked: (u ? isBanned(u) : false) || !!guestBlock,
    blockReason: u?.banReason ?? guestBlock?.reason ?? null,
    orders,
    spent: completed.reduce((s, o) => s + o.total, 0),
  };
}
