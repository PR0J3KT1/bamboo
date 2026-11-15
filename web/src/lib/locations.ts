import "server-only";
import { asc } from "drizzle-orm";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import type { LoungeSettings } from "@/lib/settings-schema";
import { getSettings } from "@/lib/settings";

/* The Bamboo Cask locations. Cached until an admin saves one (updateTag("locations")). */

export type Location = typeof schema.locations.$inferSelect;

/** The location a customer's browser last chose; set by the picker and by checkout. */
export const LOCATION_COOKIE = "bc_loc";

/** Every location, open or not, in the order the admin set. */
export async function getLocations(): Promise<Location[]> {
  "use cache";
  cacheTag("locations");
  cacheLife("days");
  return db.select().from(schema.locations).orderBy(asc(schema.locations.sort), asc(schema.locations.name));
}

/** The locations customers can order from and book. */
export async function getOpenLocations(): Promise<Location[]> {
  const all = await getLocations();
  const open = all.filter((l) => l.active);
  return open.length ? open : all.slice(0, 1);
}

/** The location this customer is ordering from: the one they chose, else the first. Reads a
    cookie, so call it inside a Suspense boundary. */
export async function customerLocation(): Promise<Location> {
  const [open, jar] = await Promise.all([getOpenLocations(), cookies()]);
  const chosen = jar.get(LOCATION_COOKIE)?.value;
  return open.find((l) => l.id === chosen) ?? open[0];
}

/** What customers read about a location: its own phone and hours, else the brand's. */
export function locationFacts(loc: Location, settings: Pick<LoungeSettings, "phone" | "hours">) {
  return {
    name: loc.name,
    where: loc.area,
    phone: loc.phone || settings.phone,
    hours: loc.hours || settings.hours,
    map: loc.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Bamboo Cask Lounge ${loc.area}`)}`,
  };
}

/** The customer's location and what they read about it. Reads a cookie: inside Suspense. */
export async function hereFacts() {
  const [loc, settings] = await Promise.all([customerLocation(), getSettings()]);
  return { loc, ...locationFacts(loc, settings) };
}

/** An order's or booking's location, and what the customer reads about it. */
export async function factsFor(locationId: string) {
  const [all, settings] = await Promise.all([getLocations(), getSettings()]);
  const loc = all.find((l) => l.id === locationId) ?? all[0];
  return { loc, ...locationFacts(loc, settings) };
}
