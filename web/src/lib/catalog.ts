import { loungePhoto, pictureFor, type Picture } from "@/lib/pictures";
import type { Menu } from "@/db/queries/menu";

/* The menu as one viewer's browser gets it: only what they may see, and nothing an admin needs.
   Pure, so it's tested (catalog.test.ts): an under-18's catalog must not name a single drink. */

type MenuData = Pick<Menu, "items" | "families" | "shelves" | "pairings" | "bundles" | "bundleParts">;

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
  picture: Picture | null;
  categoryId: string;
  shelfId: string | null;
  brand: string | null;
  abv: number | null;
  origin: string | null;
};
export type CatalogFamily = { id: string; name: string; sizeLabel: string; leadItemId: string | null };
export type CatalogShelf = { id: string; name: string };
/** A "Who's eating?" plate: a fixed set of dishes, priced as the sum of its parts. */
export type CatalogBundle = { id: string; name: string; who: string; photo: { src: string; alt: string } | null; parts: { itemId: string; qty: number }[] };
export type Catalog = { items: CatalogItem[]; families: CatalogFamily[]; shelves: CatalogShelf[]; bundles: CatalogBundle[]; pairs: Record<string, string[]> };

/** The menu cut down to what a viewer may see: alcohol only for adults. */
export function toCatalog(menu: MenuData, adult: boolean): Catalog {
  const items = menu.items
    .filter((i) => !i.alcohol || adult)
    .map((i) => ({
      id: i.id, name: i.name, description: i.description, price: i.price, alcohol: i.alcohol, familyId: i.familyId,
      portion: i.portion, tag: i.tag, options: i.options, optionLabel: i.optionLabel, kind: i.kind, size: i.size, serve: i.serve, picture: pictureFor(i),
      categoryId: i.categoryId, shelfId: i.shelfId, brand: i.brand, abv: i.abv, origin: i.origin,
    }));
  const visible = new Set(items.map((i) => i.id));
  const pairs: Record<string, string[]> = {};
  /* both ends must be on this viewer's menu: a pairing keyed by a bottle would name the bottle */
  const visibleFamilies = new Set(items.map((i) => i.familyId).filter(Boolean));
  for (const p of menu.pairings) {
    if (visible.has(p.itemId) && (visible.has(p.subjectId) || visibleFamilies.has(p.subjectId))) (pairs[p.subjectId] ??= []).push(p.itemId);
  }
  return {
    items,
    families: menu.families
      .filter((f) => items.some((i) => i.familyId === f.id))
      .map((f) => ({ id: f.id, name: f.name, sizeLabel: f.sizeLabel, leadItemId: f.leadItemId })),
    shelves: menu.shelves.filter((s) => items.some((i) => i.shelfId === s.id)).map((s) => ({ id: s.id, name: s.name })),
    /* a plate shows only when every part is on the menu for this viewer (so none with alcohol for
       guests and under-18s) */
    bundles: menu.bundles
      .map((b) => ({ id: b.id, name: b.name, who: b.who, photo: b.photoKey ? loungePhoto(b.photoKey) : null, parts: menu.bundleParts.filter((p) => p.bundleId === b.id).map((p) => ({ itemId: p.itemId, qty: p.qty })) }))
      .filter((b) => b.parts.length > 0 && b.parts.every((p) => visible.has(p.itemId))),
    pairs,
  };
}
