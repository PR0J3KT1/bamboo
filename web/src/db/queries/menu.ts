import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";

/* The whole menu, cached across requests. Admin edits call updateTag("menu"). */
export async function getMenu() {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const [categories, items, shelves, families, pairings, bundles, bundleParts] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    db.select().from(schema.items).where(eq(schema.items.active, true)).orderBy(asc(schema.items.sort)),
    db.select().from(schema.shelves).orderBy(asc(schema.shelves.sort)),
    db.select().from(schema.families),
    db.select().from(schema.pairings).orderBy(asc(schema.pairings.sort)),
    db.select().from(schema.bundles).orderBy(asc(schema.bundles.sort)),
    db.select().from(schema.bundleParts),
  ]);
  return { categories, items, shelves, families, pairings, bundles, bundleParts };
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

export { toCatalog, type Catalog, type CatalogBundle, type CatalogFamily, type CatalogItem, type CatalogShelf } from "@/lib/catalog";
