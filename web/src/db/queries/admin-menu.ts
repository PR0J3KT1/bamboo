import "server-only";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { db, schema } from "@/db";
import { pictureFor, type Picture } from "@/lib/pictures";

export type AdminSize = { id: string; portion: string | null; price: number; active: boolean };

/** One row in the admin menu: a dish (all its sizes together) or a single drink. */
export type AdminDish = {
  key: string; // the family id, or the item id when there's only one size
  familyId: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  shelfId: string | null;
  tag: string | null;
  options: string[] | null;
  optionLabel: string | null;
  sizeLabel: string | null;
  alcohol: boolean;
  brand: string | null;
  kind: string | null;
  size: string | null;
  abv: number | null;
  origin: string | null;
  serve: string | null;
  image: string | null;
  /** what the menu shows: an uploaded photo, the lounge's, a credited dish photo or the bottle */
  picture: Picture | null;
  hasOldPhoto: boolean; // a photo from the old site's sprite sheets or the lounge's photo set
  sort: number;
  sizes: AdminSize[];
};

export type AdminMenuData = {
  dishes: AdminDish[];
  categories: { id: string; name: string; note: string | null; kind: string }[];
  shelves: { id: string; name: string }[];
};

/** Everything at one location, sold-out items included, for the admin: the shared dishes at that
    location's prices. Not cached: it's read rarely and must be current. */
export async function getAdminMenu(locationId: string): Promise<AdminMenuData> {
  const [items, families, categories, shelves] = await Promise.all([
    db
      .select({ ...getTableColumns(schema.items), herePrice: schema.locationItems.price, hereActive: schema.locationItems.active })
      .from(schema.items)
      .leftJoin(schema.locationItems, and(eq(schema.locationItems.itemId, schema.items.id), eq(schema.locationItems.locationId, locationId)))
      /* sizes taken out of a dish are kept for old orders, but not listed */
      .where(eq(schema.items.active, true))
      .orderBy(asc(schema.items.sort)),
    db.select().from(schema.families),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    db.select().from(schema.shelves).orderBy(asc(schema.shelves.sort)),
  ]);
  const fam = new Map(families.map((f) => [f.id, f]));
  const dishes = new Map<string, AdminDish>();
  for (const i of items) {
    const key = i.familyId ?? i.id;
    /* not sold here yet: shown sold out, at the listed price */
    const size: AdminSize = { id: i.id, portion: i.familyId ? i.portion : i.size, price: i.herePrice ?? i.price, active: !!i.hereActive };
    const existing = dishes.get(key);
    if (existing) {
      existing.sizes.push(size);
      continue;
    }
    const f = i.familyId ? fam.get(i.familyId) : undefined;
    dishes.set(key, {
      key,
      familyId: i.familyId,
      name: f?.name ?? i.name,
      description: i.description,
      categoryId: i.categoryId,
      shelfId: i.shelfId,
      tag: i.tag,
      options: i.options,
      optionLabel: i.optionLabel,
      sizeLabel: f?.sizeLabel ?? null,
      alcohol: i.alcohol,
      brand: i.brand,
      kind: i.kind,
      size: i.size,
      abv: i.abv,
      origin: i.origin,
      serve: i.serve,
      image: i.image,
      picture: pictureFor(i),
      hasOldPhoto: !!(i.sprite || i.photoKey),
      sort: i.sort,
      sizes: [size],
    });
  }
  return {
    dishes: [...dishes.values()],
    /* sections with dishes of their own ("Today's menu" only points at dishes elsewhere) */
    categories: categories.filter((c) => c.kind === "items" && items.some((i) => i.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name, note: c.note, kind: c.kind })),
    shelves: shelves.map((s) => ({ id: s.id, name: s.name })),
  };
}
