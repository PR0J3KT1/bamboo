"use server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getViewer, isPhoneBlocked } from "@/lib/session";
import { BLOCKED_MESSAGE } from "@/lib/blocked";
import { normalizeKenyanPhone } from "@/lib/phone";
import { todayInNairobi } from "@/lib/age";
import { getSettings } from "@/lib/settings";
import { checkRoom, checkTable, OPEN_REQUESTS_PER_PHONE } from "@/lib/bookings";
import { getOpenLocations } from "@/lib/locations";

export type BookingResult = { ok: true; id: string; code: string } | { ok: false; error: string };

const Who = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  phone: z.string().max(20),
  note: z.string().trim().max(300).nullable().optional(),
  /* which lounge */
  locationId: z.string().min(1).max(60),
});

async function openLocation(id: string) {
  return (await getOpenLocations()).find((l) => l.id === id) ?? null;
}
const RoomInput = Who.extend({ room: z.string().max(8), checkIn: z.string().max(10), nights: z.number(), guests: z.number() });
const TableInput = Who.extend({ date: z.string().max(10), time: z.string().max(5), people: z.number(), occasion: z.string().max(40).nullable().optional() });

function nowInNairobi() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

/* Who's asking: the number must be a Kenyan mobile that isn't blocked, and can't have more than a
   few requests still waiting (so nobody can fill the list by accident or on purpose). */
async function checkWho(raw: z.infer<typeof Who>): Promise<{ ok: true; phone: string; userId: string | null } | { ok: false; error: string }> {
  const phone = normalizeKenyanPhone(raw.phone);
  if (!phone) return { ok: false, error: "Enter a Kenyan mobile number, like 0712 345 678." };
  if (await isPhoneBlocked(phone)) return { ok: false, error: BLOCKED_MESSAGE };
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.phone, phone), eq(schema.bookings.status, "requested")));
  if (n >= OPEN_REQUESTS_PER_PHONE) return { ok: false, error: `This number already has ${n} requests waiting. The lounge will reply to those first; call them if it's urgent.` };
  const viewer = await getViewer();
  return { ok: true, phone, userId: viewer.user?.id ?? null };
}

function firstIssue(e: z.ZodError) {
  const i = e.issues[0];
  return i?.path[0] === "name" ? "Enter your name." : "Something in the form didn't look right. Refresh the page and try again.";
}

async function insert(values: Omit<typeof schema.bookings.$inferInsert, "code">) {
  const [b] = await db
    .insert(schema.bookings)
    .values({ ...values, code: sql`'BK-' || nextval('booking_code_seq')` })
    .returning({ id: schema.bookings.id, code: schema.bookings.code });
  return b;
}

/** Ask for a room. The lounge confirms or declines in the admin; the customer gets an SMS. */
export async function requestRoom(raw: z.input<typeof RoomInput>): Promise<BookingResult> {
  const p = RoomInput.safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  const settings = await getSettings();
  const room = checkRoom(p.data, todayInNairobi(), settings.rooms);
  if (!room.ok) return room;
  const [who, location] = await Promise.all([checkWho(p.data), openLocation(p.data.locationId)]);
  if (!who.ok) return who;
  if (!location) return { ok: false, error: "That lounge isn't taking bookings just now. Choose another, or call us." };
  const b = await insert({
    locationId: location.id,
    kind: "room",
    userId: who.userId,
    name: p.data.name,
    phone: who.phone,
    guests: room.data.guests,
    room: room.data.room,
    checkIn: room.data.checkIn,
    nights: room.data.nights,
    rate: room.data.rate,
    note: p.data.note || null,
  });
  return { ok: true, id: b.id, code: b.code };
}

/** Book a table. Same flow as a room. */
export async function requestTable(raw: z.input<typeof TableInput>): Promise<BookingResult> {
  const p = TableInput.safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  const settings = await getSettings();
  const table = checkTable({ ...p.data, occasion: p.data.occasion ?? null }, todayInNairobi(), nowInNairobi(), settings.tables);
  if (!table.ok) return table;
  const [who, location] = await Promise.all([checkWho(p.data), openLocation(p.data.locationId)]);
  if (!who.ok) return who;
  if (!location) return { ok: false, error: "That lounge isn't taking bookings just now. Choose another, or call us." };
  const b = await insert({
    locationId: location.id,
    kind: "table",
    userId: who.userId,
    name: p.data.name,
    phone: who.phone,
    guests: table.data.people,
    at: table.data.at,
    occasion: table.data.occasion,
    note: p.data.note || null,
  });
  return { ok: true, id: b.id, code: b.code };
}

/** The customer changes their mind, while the booking is still waiting or confirmed. Only from
    the booking's own page, whose address holds its random id. */
export async function cancelMyBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "That booking no longer exists." };
  const r = await db
    .update(schema.bookings)
    .set({ status: "cancelled", handledBy: "Customer" })
    .where(and(eq(schema.bookings.id, id), sql`${schema.bookings.status} in ('requested', 'confirmed')`))
    .returning({ id: schema.bookings.id });
  return r.length ? { ok: true } : { ok: false, error: "This booking can't be cancelled any more. Call the lounge." };
}
