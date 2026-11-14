"use server";
import { asc, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { NotAllowed, requirePermission, type UserRow } from "@/lib/session";

export type PlateResult = { ok: true; message: string; id?: string } | { ok: false; error: string };

async function guarded(fn: (me: UserRow) => Promise<PlateResult>): Promise<PlateResult> {
  try {
    const me = await requirePermission({ menu: ["edit"] });
    const r = await fn(me);
    if (r.ok) updateTag("menu");
    return r;
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
}

const Plate = z.object({
  id: z.string().max(40).nullable(), // null: a new plate
  name: z.string().trim().min(1, "Give the plate a name.").max(60),
  who: z.enum(["one", "two", "table"]),
  photoKey: z.string().max(40).nullable(),
  parts: z
    .array(z.object({ itemId: z.string().min(1).max(80), qty: z.number().int().min(1).max(20) }))
    .min(1, "Put at least one dish on the plate.")
    .max(12, "Keep a plate to 12 dishes."),
});

/** Save a "Who's eating?" plate: its name, who it's for, photo and dishes. */
export async function savePlate(raw: z.input<typeof Plate>): Promise<PlateResult> {
  return guarded(async (me) => {
    const p = Plate.safeParse(raw);
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Something didn't look right." };
    const v = p.data;
    const ids = [...new Set(v.parts.map((x) => x.itemId))];
    if (ids.length !== v.parts.length) return { ok: false, error: "A dish is on the plate twice. Change its number instead." };
    const found = await db.select({ id: schema.items.id, alcohol: schema.items.alcohol }).from(schema.items).where(inArray(schema.items.id, ids));
    if (found.length !== ids.length) return { ok: false, error: "A dish on the plate is no longer on the menu." };
    const id = v.id ?? `x-${Math.random().toString(36).slice(2, 8)}`;
    const before = v.id ? (await db.select().from(schema.bundles).where(eq(schema.bundles.id, v.id)).limit(1))[0] : null;
    if (v.id && !before) return { ok: false, error: "That plate no longer exists." };
    await db.transaction(async (tx) => {
      if (before) {
        await tx.update(schema.bundles).set({ name: v.name, who: v.who, photoKey: v.photoKey }).where(eq(schema.bundles.id, id));
        await tx.delete(schema.bundleParts).where(eq(schema.bundleParts.bundleId, id));
      } else {
        const last = await tx.select({ sort: schema.bundles.sort }).from(schema.bundles).orderBy(asc(schema.bundles.sort));
        await tx.insert(schema.bundles).values({ id, name: v.name, who: v.who, photoKey: v.photoKey, sort: (last.at(-1)?.sort ?? -1) + 1 });
      }
      await tx.insert(schema.bundleParts).values(v.parts.map((x) => ({ bundleId: id, itemId: x.itemId, qty: x.qty })));
      await audit(tx, me, before ? "bundle.update" : "bundle.create", { type: "bundle", id }, before ? { name: before.name, who: before.who } : null, { name: v.name, who: v.who, parts: v.parts });
    });
    const withAlcohol = found.some((f) => f.alcohol);
    return { ok: true, id, message: `${v.name} saved${withAlcohol ? ". It has alcohol, so only adults see it" : ""}` };
  });
}

export async function deletePlate(id: string): Promise<PlateResult> {
  return guarded(async (me) => {
    const [b] = await db.select().from(schema.bundles).where(eq(schema.bundles.id, String(id))).limit(1);
    if (!b) return { ok: false, error: "That plate no longer exists." };
    await db.transaction(async (tx) => {
      await tx.delete(schema.bundles).where(eq(schema.bundles.id, b.id)); // its parts go with it
      await audit(tx, me, "bundle.delete", { type: "bundle", id: b.id }, { name: b.name }, null);
    });
    return { ok: true, message: `${b.name} taken off the menu` };
  });
}

/** Move a plate one place up or down the list. */
export async function movePlate(id: string, dir: -1 | 1): Promise<PlateResult> {
  return guarded(async (me) => {
    const all = await db.select({ id: schema.bundles.id, sort: schema.bundles.sort }).from(schema.bundles).orderBy(asc(schema.bundles.sort), asc(schema.bundles.id));
    const i = all.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return { ok: false, error: "It can't move further." };
    const order = all.map((b) => b.id);
    [order[i], order[j]] = [order[j], order[i]];
    await db.transaction(async (tx) => {
      for (const [n, bid] of order.entries()) await tx.update(schema.bundles).set({ sort: n }).where(eq(schema.bundles.id, bid));
      await audit(tx, me, "bundle.order", { type: "bundle", id }, null, { order });
    });
    return { ok: true, message: "Order saved" };
  });
}
