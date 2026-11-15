import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayInNairobi } from "@/lib/age";

const b = schema.bookings;

/* When a booking happens: a room's check-in day, or a table's day in Nairobi. Used to sort and
   to tell what's still ahead. */
const day = sql<string>`coalesce(${b.checkIn}::text, to_char(${b.at} at time zone 'Africa/Nairobi', 'YYYY-MM-DD'))`;

export type BookingTab = "requests" | "upcoming" | "past";

/** Requests waiting (oldest first, so nobody waits long), upcoming confirmed bookings (soonest
    first), or everything else (newest first). */
export async function listBookings(tab: BookingTab, locationId: string | null) {
  const today = todayInNairobi();
  const where =
    tab === "requests"
      ? eq(b.status, "requested")
      : tab === "upcoming"
        ? and(eq(b.status, "confirmed"), gte(day, today))
        : or(inArray(b.status, ["declined", "cancelled", "completed"]), and(eq(b.status, "confirmed"), lt(day, today)));
  const order = tab === "requests" ? [asc(b.createdAt)] : tab === "upcoming" ? [asc(day), asc(b.at)] : [desc(b.updatedAt)];
  return db
    .select({ b, location: schema.locations.name })
    .from(b)
    .innerJoin(schema.locations, eq(b.locationId, schema.locations.id))
    .where(and(where, locationId ? eq(b.locationId, locationId) : undefined))
    .orderBy(...order)
    .limit(200)
    .then((rows) => rows.map((r) => ({ ...r.b, location: r.location })));
}

export async function countRequests(locationId: string | null) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(b)
    .where(and(eq(b.status, "requested"), locationId ? eq(b.locationId, locationId) : undefined));
  return n;
}

export async function getBooking(id: string) {
  const [row] = await db.select().from(b).where(eq(b.id, id)).limit(1);
  if (!row) return null;
  /* the customer's other bookings, by number, for context */
  const others = await db
    .select({ id: b.id, code: b.code, status: b.status, kind: b.kind, createdAt: b.createdAt })
    .from(b)
    .where(and(eq(b.phone, row.phone), sql`${b.id} <> ${row.id}`))
    .orderBy(desc(b.createdAt))
    .limit(10);
  return { b: row, others };
}
