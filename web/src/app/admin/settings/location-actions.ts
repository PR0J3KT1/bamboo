"use server";
import { eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { NotAllowed, requirePermission } from "@/lib/session";
import { normalizeKenyanPhone } from "@/lib/phone";
import { worksAt } from "@/lib/scope";

export type LocationResult = { ok: true; message: string; id?: string } | { ok: false; error: string };

const opt = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null);

/* What a manager may change at their own location */
const Local = z.object({
  phone: z
    .string()
    .trim()
    .nullable()
    .transform((v, ctx) => {
      if (!v) return null;
      const p = normalizeKenyanPhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "That isn't a Kenyan mobile number." });
      return p;
    }),
  hours: opt(80),
  orderingOpen: z.boolean(),
});

/* and what only an admin may */
const Full = Local.extend({
  name: z.string().trim().min(2, "Give the location a name, like Westlands.").max(40),
  area: z.string().trim().min(3, "Say where it is, like Woodvale Grove, Westlands.").max(80),
  lat: z.number({ error: "Latitude is a number, like -1.2676." }).min(-5, "That latitude isn't in Kenya.").max(5, "That latitude isn't in Kenya."),
  lng: z.number({ error: "Longitude is a number, like 36.8108." }).min(33, "That longitude isn't in Kenya.").max(42, "That longitude isn't in Kenya."),
  mapUrl: opt(300).refine((v) => !v || /^https:\/\//.test(v), "A map link starts with https://"),
  tumabodaLocationId: opt(60),
  active: z.boolean(),
});

export type LocationInput = z.input<typeof Full>;

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "location";

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Something in the form isn't right.";
}

/** Save a location. Managers change their own location's phone, hours and online ordering;
    admins change everything, anywhere. */
export async function saveLocation(id: string, raw: LocationInput): Promise<LocationResult> {
  try {
    const me = await requirePermission({ location: ["edit"] });
    const [before] = await db.select().from(schema.locations).where(eq(schema.locations.id, String(id))).limit(1);
    if (!before) return { ok: false, error: "That location no longer exists." };
    if (!worksAt(me, before.id)) return { ok: false, error: "You can only change your own location." };
    const admin = can(me.role, { location: ["create"] });
    const p = (admin ? Full : Local).safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    if ("active" in p.data && !p.data.active) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.locations).where(sql`${schema.locations.active} and ${schema.locations.id} <> ${before.id}`);
      if (n === 0) return { ok: false, error: "Customers need at least one open location. Open another first." };
    }
    await db.transaction(async (tx) => {
      await tx.update(schema.locations).set(p.data).where(eq(schema.locations.id, before.id));
      await audit(tx, me, "location.update", { type: "location", id: before.id }, before, p.data);
    });
    updateTag("locations");
    return { ok: true, message: `${"name" in p.data ? p.data.name : before.name} saved` };
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
}

/** Add a location (admins). Its menu starts as a copy of another location's: the same dishes,
    prices and sold-out switches, which its manager then changes. */
export async function createLocation(raw: LocationInput, copyFrom: string): Promise<LocationResult> {
  try {
    const me = await requirePermission({ location: ["create"] });
    const p = Full.safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    const [source] = await db.select().from(schema.locations).where(eq(schema.locations.id, String(copyFrom))).limit(1);
    if (!source) return { ok: false, error: "Choose which location's menu to start from." };
    let id = slug(p.data.name);
    const taken = await db.select({ id: schema.locations.id }).from(schema.locations);
    if (taken.some((t) => t.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
    await db.transaction(async (tx) => {
      await tx.insert(schema.locations).values({ id, ...p.data, sort: taken.length });
      await tx.execute(sql`insert into location_items (location_id, item_id, price, active) select ${id}, item_id, price, active from location_items where location_id = ${source.id}`);
      await audit(tx, me, "location.create", { type: "location", id }, null, { ...p.data, copiedFrom: source.id });
    });
    updateTag("locations");
    updateTag("menu");
    return { ok: true, message: `Bamboo Cask ${p.data.name} added, with ${source.name}'s menu`, id };
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
}
