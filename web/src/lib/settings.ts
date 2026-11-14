import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { withDefaults, type LoungeSettings } from "@/lib/settings-schema";

/* The lounge's details the admin edits in Settings. Stored as one JSON value under "lounge";
   anything missing falls back to the defaults (the facts from the old site), so a new database
   works before anyone has saved. Read through getSettings(), cached until a save calls
   updateTag("settings"). */

export { DEFAULTS, SettingsSchema, withDefaults, type LoungeSettings } from "@/lib/settings-schema";

export async function getSettings(): Promise<LoungeSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "lounge")).limit(1);
  return withDefaults(row?.value);
}
