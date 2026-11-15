import "server-only";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { customerLocation } from "@/lib/locations";

/* One location's menu, cached across requests: the shared dishes and drinks, at that location's
   prices, without what it doesn't sell or has sold out. Admin edits call updateTag("menu"). */
export async function getMenu(locationId: string) {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const [categories, items, shelves, families, pairings, bundles, bundleParts] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    db
      .select({ ...getTableColumns(schema.items), price: schema.locationItems.price })
      .from(schema.items)
      .innerJoin(schema.locationItems, and(eq(schema.locationItems.itemId, schema.items.id), eq(schema.locationItems.locationId, locationId)))
      .where(and(eq(schema.items.active, true), eq(schema.locationItems.active, true)))
      .orderBy(asc(schema.items.sort)),
    db.select().from(schema.shelves).orderBy(asc(schema.shelves.sort)),
    db.select().from(schema.families),
    db.select().from(schema.pairings).orderBy(asc(schema.pairings.sort)),
    db.select().from(schema.bundles).orderBy(asc(schema.bundles.sort)),
    db.select().from(schema.bundleParts),
  ]);
  /* a plate only where every dish on it is sold */
  const here = new Set(items.map((i) => i.id));
  const whole = new Set(bundles.filter((b) => bundleParts.filter((p) => p.bundleId === b.id).every((p) => here.has(p.itemId))).map((b) => b.id));
  return { categories, items, shelves, families, pairings, bundles: bundles.filter((b) => whole.has(b.id)), bundleParts: bundleParts.filter((p) => whole.has(p.bundleId)) };
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

/** The menu of the location this customer is ordering from. Reads a cookie: call it inside a
    Suspense boundary. */
export async function menuHere() {
  return getMenu((await customerLocation()).id);
}
