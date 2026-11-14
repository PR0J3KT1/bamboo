/* Load the exported menu (src/db/seed-data/menu.json) into Postgres.
   Only adds rows that aren't there yet, so running it again never overwrites prices or edits
   made in the admin. usage: pnpm db:seed */
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {}

type Menu = {
  popularPlaces: string[];
  categories: { id: string; name: string; note: string | null; kind: "items" | "bundles" | "party" | "rooms" | "games"; adult: boolean; sort: number }[];
  shelves: { id: string; name: string; sort: number }[];
  families: { id: string; name: string; label: string; lead: string }[];
  items: {
    id: string; name: string; description: string | null; price: number; category: string; alcohol: boolean;
    family: string | null; portion: string | null; tag: string | null; options: string[] | null; optionLabel: string | null;
    brand: string | null; kind: string | null; shelf: string | null; size: string | null; abv: number | null;
    origin: string | null; notes: string | null; serve: string | null; sprite: string | null; photo: string | null;
    credit: schema.PhotoCredit | null;
  }[];
  bundles: { id: string; name: string; who: string; photo: string | null; parts: [string, number][] }[];
  pairings: Record<string, string[]>;
  places: { id: string; name: string; detail: string; km: number; keywords: string }[];
};

const menu: Menu = JSON.parse(readFileSync(new URL("../src/db/seed-data/menu.json", import.meta.url), "utf8"));
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql, { schema });

async function main() {
  const itemIds = new Set(menu.items.map((i) => i.id));
  const shelves = [
    { id: "house", name: "House favourites", sort: -1 },
    ...menu.shelves,
    { id: "soft", name: "Soft drinks", sort: menu.shelves.length },
  ];

  await db.transaction(async (tx) => {
    await tx.insert(schema.categories).values(
      menu.categories.map((c) => ({ id: c.id, name: c.name, note: c.note, kind: c.kind, adultOnly: c.adult, sort: c.sort })),
    ).onConflictDoNothing();
    await tx.insert(schema.shelves).values(shelves).onConflictDoNothing();
    await tx.insert(schema.families).values(
      menu.families.map((f) => ({ id: f.id, name: f.name, sizeLabel: f.label, leadItemId: f.lead })),
    ).onConflictDoNothing();
    await tx.insert(schema.items).values(
      menu.items.map((i, n) => ({
        id: i.id, name: i.name, description: i.description, price: i.price, categoryId: i.category,
        alcohol: i.alcohol, familyId: i.family, portion: i.portion, tag: i.tag, options: i.options,
        optionLabel: i.optionLabel, brand: i.brand, kind: i.kind,
        shelfId: i.shelf ?? (i.category === "bar" ? "house" : null),
        size: i.size, abv: i.abv, origin: i.origin, notes: i.notes, serve: i.serve,
        sprite: i.sprite, photoKey: i.photo, credit: i.credit, sort: n,
      })),
    ).onConflictDoNothing();
    await tx.insert(schema.bundles).values(
      menu.bundles.map((b, n) => ({ id: b.id, name: b.name, who: b.who, photoKey: b.photo, sort: n })),
    ).onConflictDoNothing();
    await tx.insert(schema.bundleParts).values(
      menu.bundles.flatMap((b) => b.parts.map(([itemId, qty]) => ({ bundleId: b.id, itemId, qty }))),
    ).onConflictDoNothing();
    const pairs = Object.entries(menu.pairings).flatMap(([subjectId, list]) =>
      [...new Set(list)].filter((id) => itemIds.has(id)).map((itemId, sort) => ({ subjectId, itemId, sort })),
    );
    if (pairs.length) await tx.insert(schema.pairings).values(pairs).onConflictDoNothing();
    const popular = new Set(menu.popularPlaces);
    await tx.insert(schema.deliveryPlaces).values(
      menu.places.map((p) => ({ ...p, popular: popular.has(p.id) })),
    ).onConflictDoNothing();
  });

  const [{ count }] = await sql`select count(*)::int as count from items`;
  console.log(`seeded: ${count} items in the database`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
