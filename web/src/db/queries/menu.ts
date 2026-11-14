import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";

/* The whole menu, cached across requests. Admin edits call updateTag("menu"). */
export async function getMenu() {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const [categories, items, shelves, families, pairings] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    db.select().from(schema.items).where(eq(schema.items.active, true)).orderBy(asc(schema.items.sort)),
    db.select().from(schema.shelves).orderBy(asc(schema.shelves.sort)),
    db.select().from(schema.families),
    db.select().from(schema.pairings).orderBy(asc(schema.pairings.sort)),
  ]);
  return { categories, items, shelves, families, pairings };
}

/* Delivery places, popular ones first. Rarely change, so cached for a day. */
export async function getPlaces() {
  "use cache";
  cacheTag("places");
  cacheLife("days");
  return db
    .select({ id: schema.deliveryPlaces.id, name: schema.deliveryPlaces.name, detail: schema.deliveryPlaces.detail, km: schema.deliveryPlaces.km, keywords: schema.deliveryPlaces.keywords, popular: schema.deliveryPlaces.popular })
    .from(schema.deliveryPlaces)
    .orderBy(asc(schema.deliveryPlaces.km));
}

export type Menu = Awaited<ReturnType<typeof getMenu>>;
export type MenuItem = Menu["items"][number];
export type DeliveryPlace = Awaited<ReturnType<typeof getPlaces>>[number];

/** What the browser needs to show an item and price a basket: no admin fields. */
export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  alcohol: boolean;
  familyId: string | null;
  portion: string | null;
  tag: string | null;
  options: string[] | null;
  optionLabel: string | null;
  kind: string | null;
  size: string | null;
  serve: string | null;
  image: string | null;
};
export type CatalogFamily = { id: string; name: string; sizeLabel: string; leadItemId: string | null };
export type Catalog = { items: CatalogItem[]; families: CatalogFamily[]; pairs: Record<string, string[]> };

/** The menu cut down to what a viewer may see: alcohol only for adults. */
export function toCatalog(menu: Menu, adult: boolean): Catalog {
  const items = menu.items
    .filter((i) => !i.alcohol || adult)
    .map((i) => ({
      id: i.id, name: i.name, description: i.description, price: i.price, alcohol: i.alcohol, familyId: i.familyId,
      portion: i.portion, tag: i.tag, options: i.options, optionLabel: i.optionLabel, kind: i.kind, size: i.size, serve: i.serve, image: i.image,
    }));
  const visible = new Set(items.map((i) => i.id));
  const pairs: Record<string, string[]> = {};
  for (const p of menu.pairings) if (visible.has(p.itemId)) (pairs[p.subjectId] ??= []).push(p.itemId);
  return {
    items,
    families: menu.families
      .filter((f) => items.some((i) => i.familyId === f.id))
      .map((f) => ({ id: f.id, name: f.name, sizeLabel: f.sizeLabel, leadItemId: f.leadItemId })),
    pairs,
  };
}
