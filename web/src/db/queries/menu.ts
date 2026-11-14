import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";

/* The whole menu, cached across requests. Admin edits call updateTag("menu"). */
export async function getMenu() {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const [categories, items, shelves, families] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    db.select().from(schema.items).where(eq(schema.items.active, true)).orderBy(asc(schema.items.sort)),
    db.select().from(schema.shelves).orderBy(asc(schema.shelves.sort)),
    db.select().from(schema.families),
  ]);
  return { categories, items, shelves, families };
}

export type Menu = Awaited<ReturnType<typeof getMenu>>;
export type MenuItem = Menu["items"][number];
