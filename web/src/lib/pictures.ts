import photos from "@/db/seed-data/photos.json";
import type { PhotoCredit } from "@/db/schema";

/* What picture an item shows, in this order:
     1. a photo uploaded in the admin (items.image, on R2)
     2. the lounge's own photo (items.photoKey: the hero, kienyeji, tilapia…)
     3. a free-licensed photo of the dish for illustration, credited (photos.json "dishes")
     4. the bottle, cut from a sheet of bottle photos (items.sprite, "sheet:cell"), credited
   Nothing matches: no picture, and the card shows the dish by name alone. */

export type Picture =
  | { kind: "photo"; src: string; alt: string; credit: PhotoCredit | null; illustration: boolean }
  | { kind: "bottle"; sheet: string; x: number; y: number; credit: PhotoCredit | null };

type Source = { id: string; name: string; familyId: string | null; image: string | null; photoKey: string | null; sprite: string | null; credit: PhotoCredit | null };

const LOUNGE = photos.lounge as Record<string, { src: string; alt: string }>;
const FOOD = photos.food as unknown as Record<string, { src: string; alt: string; credit: PhotoCredit | null }>;
const DISHES = photos.dishes as Record<string, string>;

/* the sheets are 6 bottles across and 5 down */
export const SHEET_COLS = 6;
export const SHEET_ROWS = 5;

export function pictureFor(it: Source): Picture | null {
  if (it.image) return { kind: "photo", src: it.image, alt: it.name, credit: null, illustration: false };
  const own = it.photoKey ? LOUNGE[it.photoKey] : undefined;
  if (own) return { kind: "photo", src: own.src, alt: own.alt || it.name, credit: null, illustration: false };
  const key = DISHES[it.id] ?? (it.familyId ? DISHES[it.familyId] : undefined);
  const food = key ? FOOD[key] : undefined;
  if (food) return { kind: "photo", src: food.src, alt: food.alt, credit: food.credit, illustration: true };
  const m = it.sprite?.match(/^([a-z0-9-]+):(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    return { kind: "bottle", sheet: m[1], x: n % SHEET_COLS, y: Math.floor(n / SHEET_COLS), credit: it.credit };
  }
  return null;
}

/** A photo of the lounge itself, by key ("hero", "lounge", "rooms", "sports"…). */
export function loungePhoto(key: string) {
  return LOUNGE[key] ?? null;
}
