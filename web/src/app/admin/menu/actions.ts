"use server";
import { eq, inArray, or } from "drizzle-orm";
import { updateTag } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { NotAllowed, requirePermission, type UserRow } from "@/lib/session";
import { putPublic, StorageNotConfigured } from "@/lib/storage";

export type MenuResult = { ok: true; message: string; key?: string } | { ok: false; error: string };

async function guarded(perm: "toggle" | "edit", fn: (me: UserRow) => Promise<MenuResult>): Promise<MenuResult> {
  try {
    const me = await requirePermission({ menu: [perm] });
    const r = await fn(me);
    if (r.ok) updateTag("menu"); // the customer menu shows the change on its next load
    return r;
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    if (e instanceof StorageNotConfigured) return { ok: false, error: e.message };
    throw e;
  }
}

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";
const suffix = () => Math.random().toString(36).slice(2, 6);

async function dishRows(key: string) {
  return db.select().from(schema.items).where(or(eq(schema.items.id, key), eq(schema.items.familyId, key)));
}

/* ───────── staff: on the menu, or sold out ───────── */

export async function setAvailability(key: string, active: boolean): Promise<MenuResult> {
  return guarded("toggle", async (me) => {
    const rows = await dishRows(String(key));
    if (!rows.length) return { ok: false, error: "That dish is no longer on the list." };
    const ids = rows.map((r) => r.id);
    await db.transaction(async (tx) => {
      await tx.update(schema.items).set({ active: !!active }).where(inArray(schema.items.id, ids));
      await audit(tx, me, active ? "item.on" : "item.sold_out", { type: "item", id: key }, { active: rows.map((r) => r.active) }, { active: !!active });
    });
    const name = rows[0].familyId ? (await db.select().from(schema.families).where(eq(schema.families.id, rows[0].familyId)))[0]?.name : rows[0].name;
    return { ok: true, message: active ? `${name} is back on the menu` : `${name} is sold out` };
  });
}

/* ───────── admins: prices ───────── */

const Price = z.number().int().min(1).max(1_000_000);

export async function savePrices(changes: { id: string; price: number }[]): Promise<MenuResult> {
  return guarded("edit", async (me) => {
    const parsed = z.array(z.object({ id: z.string().min(1).max(80), price: Price })).min(1).max(500).safeParse(changes);
    if (!parsed.success) return { ok: false, error: "Prices must be whole shillings, from 1 to 1,000,000." };
    const ids = parsed.data.map((c) => c.id);
    const rows = await db.select({ id: schema.items.id, name: schema.items.name, price: schema.items.price }).from(schema.items).where(inArray(schema.items.id, ids));
    const before = new Map(rows.map((r) => [r.id, r]));
    const real = parsed.data.filter((c) => before.has(c.id) && before.get(c.id)!.price !== c.price);
    if (!real.length) return { ok: true, message: "No prices changed" };
    await db.transaction(async (tx) => {
      for (const c of real) {
        await tx.update(schema.items).set({ price: c.price }).where(eq(schema.items.id, c.id));
        await audit(tx, me, "item.price", { type: "item", id: c.id }, { price: before.get(c.id)!.price }, { price: c.price });
      }
    });
    return { ok: true, message: real.length === 1 ? `${before.get(real[0].id)!.name}: KES ${real[0].price.toLocaleString("en-KE")}` : `${real.length} prices saved` };
  });
}

/* ───────── admins: a whole dish ───────── */

const opt = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null);
const Dish = z.object({
  key: z.string().max(80).nullable(),
  name: z.string().trim().min(1, "Give the dish a name.").max(80),
  description: opt(400),
  categoryId: z.string().min(1).max(40),
  shelfId: z.string().max(40).nullable(),
  tag: opt(30),
  options: z.array(z.string().trim().min(1).max(30)).max(8),
  optionLabel: opt(40),
  sizeLabel: opt(40),
  alcohol: z.boolean(),
  brand: opt(60),
  kind: opt(60),
  abv: z.number().min(0).max(100).nullable(),
  origin: opt(60),
  serve: opt(200),
  sizes: z
    .array(z.object({ id: z.string().max(80).nullable(), portion: opt(30), price: Price, active: z.boolean() }))
    .min(1, "A dish needs at least one size and price.")
    .max(12),
});
export type DishInput = z.input<typeof Dish>;

export async function saveDish(input: DishInput): Promise<MenuResult> {
  return guarded("edit", async (me) => {
    const parsed = Dish.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message.startsWith("Too") || !parsed.error.issues[0] ? "Something in the form isn't right." : prettyIssue(parsed.error.issues[0]) };
    const d = parsed.data;
    const multi = d.sizes.length > 1;
    if (multi && d.sizes.some((s) => !s.portion)) return { ok: false, error: "Name every size (½ kg, 1 kg, half, whole…)." };
    if (multi && new Set(d.sizes.map((s) => s.portion!.toLowerCase())).size !== d.sizes.length) return { ok: false, error: "Two sizes have the same name." };

    const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, d.categoryId));
    if (!cat) return { ok: false, error: "Choose a menu section." };
    if (d.shelfId) {
      const [sh] = await db.select().from(schema.shelves).where(eq(schema.shelves.id, d.shelfId));
      if (!sh) return { ok: false, error: "Choose a shelf." };
    }

    const existing = d.key ? await dishRows(d.key) : [];
    if (d.key && !existing.length) return { ok: false, error: "That dish is no longer on the list. Refresh the page." };
    const known = new Set(existing.map((r) => r.id));
    if (d.sizes.some((s) => s.id && !known.has(s.id))) return { ok: false, error: "A size in the form doesn't belong to this dish. Refresh the page." };

    const key = await db.transaction(async (tx) => {
      let familyId = existing[0]?.familyId ?? null;
      if (multi && !familyId) {
        familyId = `${slug(d.name)}-${suffix()}`;
        await tx.insert(schema.families).values({ id: familyId, name: d.name, sizeLabel: d.sizeLabel ?? "How much?" });
      } else if (familyId) {
        await tx.update(schema.families).set({ name: d.name, sizeLabel: d.sizeLabel ?? "How much?" }).where(eq(schema.families.id, familyId));
      }
      const sort = existing[0]?.sort ?? 100_000;
      const shared = {
        description: d.description,
        categoryId: d.categoryId,
        shelfId: d.shelfId,
        tag: d.tag,
        options: d.options.length ? d.options : null,
        optionLabel: d.options.length ? (d.optionLabel ?? "How would you like it?") : null,
        alcohol: d.alcohol,
        brand: d.brand,
        kind: d.kind,
        abv: d.abv,
        origin: d.origin,
        serve: d.serve,
      };
      const kept = new Set<string>();
      let lead: string | null = null;
      for (const s of d.sizes) {
        const fields = {
          ...shared,
          name: familyId && s.portion ? `${d.name}, ${s.portion}` : d.name,
          portion: familyId ? s.portion : null,
          size: familyId ? existing.find((r) => r.id === s.id)?.size ?? null : s.portion,
          familyId,
          price: s.price,
          active: s.active,
        };
        if (s.id) {
          await tx.update(schema.items).set(fields).where(eq(schema.items.id, s.id));
          kept.add(s.id);
          lead ??= s.active ? s.id : null;
        } else {
          const id = `${familyId ?? slug(d.name)}-${slug(s.portion ?? "")}-${suffix()}`.replace(/--+/g, "-");
          await tx.insert(schema.items).values({ id, ...fields, image: existing[0]?.image ?? null, sort });
          kept.add(id);
          lead ??= s.active ? id : null;
        }
      }
      /* sizes taken out of the form stay in old orders, so they're switched off, not deleted */
      const dropped = existing.filter((r) => !kept.has(r.id)).map((r) => r.id);
      if (dropped.length) await tx.update(schema.items).set({ active: false }).where(inArray(schema.items.id, dropped));
      if (familyId) await tx.update(schema.families).set({ leadItemId: lead ?? [...kept].at(-1)! }).where(eq(schema.families.id, familyId));

      await audit(
        tx,
        me,
        d.key ? "item.update" : "item.create",
        { type: "item", id: familyId ?? [...kept][0] },
        d.key ? existing.map((r) => ({ id: r.id, name: r.name, price: r.price, active: r.active, categoryId: r.categoryId, alcohol: r.alcohol })) : null,
        { ...shared, name: d.name, sizes: d.sizes },
      );
      return familyId ?? [...kept][0];
    });
    return { ok: true, message: d.key ? `${d.name} saved` : `${d.name} added to the menu`, key };
  });
}

function prettyIssue(i: z.core.$ZodIssue) {
  const field = String(i.path[0] ?? "");
  if (field === "sizes" && i.path.includes("price")) return "Prices must be whole shillings, from 1 to 1,000,000.";
  if (field === "name") return i.message;
  if (field === "sizes") return i.message;
  if (field === "abv") return "Strength (ABV) must be between 0 and 100.";
  return "Something in the form isn't right.";
}

/* ───────── admins: photos ───────── */

const MAX_UPLOAD = 4 * 1024 * 1024;

export async function uploadPhoto(form: FormData): Promise<MenuResult & { url?: string }> {
  let url: string | undefined;
  const r = await guarded("edit", async (me) => {
    const key = String(form.get("key") ?? "");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a photo." };
    if (file.size > MAX_UPLOAD) return { ok: false, error: "That photo is too big. Use one under 4 MB." };
    if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP photo." };
    const rows = await dishRows(key);
    if (!rows.length) return { ok: false, error: "That dish is no longer on the list." };

    let out: Buffer;
    try {
      /* turned the right way up, at most 1600 px on the long side, WebP; metadata (GPS) dropped */
      out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return { ok: false, error: "That file couldn't be read as a photo." };
    }
    url = await putPublic(`items/${slug(key)}/${Date.now().toString(36)}-${suffix()}.webp`, out, "image/webp");
    await db.transaction(async (tx) => {
      await tx.update(schema.items).set({ image: url }).where(inArray(schema.items.id, rows.map((r) => r.id)));
      await audit(tx, me, "item.photo", { type: "item", id: key }, { image: rows[0].image }, { image: url });
    });
    return { ok: true, message: "Photo saved" };
  });
  return { ...r, url };
}

export async function removePhoto(key: string): Promise<MenuResult> {
  return guarded("edit", async (me) => {
    const rows = await dishRows(String(key));
    if (!rows.length) return { ok: false, error: "That dish is no longer on the list." };
    await db.transaction(async (tx) => {
      await tx.update(schema.items).set({ image: null }).where(inArray(schema.items.id, rows.map((r) => r.id)));
      await audit(tx, me, "item.photo", { type: "item", id: key }, { image: rows[0].image }, { image: null });
    });
    return { ok: true, message: "Photo removed" };
  });
}

/* ───────── admins: a menu section's name and note ───────── */

export async function saveSection(id: string, name: string, note: string): Promise<MenuResult> {
  return guarded("edit", async (me) => {
    const n = String(name).trim().slice(0, 60);
    const t = String(note).trim().slice(0, 300) || null;
    if (!n) return { ok: false, error: "Give the section a name." };
    const [c] = await db.select().from(schema.categories).where(eq(schema.categories.id, String(id)));
    if (!c) return { ok: false, error: "That section no longer exists." };
    await db.transaction(async (tx) => {
      await tx.update(schema.categories).set({ name: n, note: t }).where(eq(schema.categories.id, c.id));
      await audit(tx, me, "category.update", { type: "category", id: c.id }, { name: c.name, note: c.note }, { name: n, note: t });
    });
    return { ok: true, message: `${n} saved` };
  });
}
