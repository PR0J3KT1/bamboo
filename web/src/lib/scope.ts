import "server-only";
import { cookies } from "next/headers";
import { atOneLocation } from "@/lib/permissions";
import { getLocations, type Location } from "@/lib/locations";
import type { UserRow } from "@/lib/session";

/* Which location's orders, menu, bookings and reports an admin page shows.
   Staff and managers: their own location, always (user.locationId), and nothing if none is set.
   Admins: the one picked in the admin bar, or every location. */

export const ADMIN_LOCATION_COOKIE = "bc_admin_loc";

export type Scope = {
  /** null: every location (admins only) */
  locationId: string | null;
  /** the location, when there is one */
  location: Location | null;
  locations: Location[];
  /** staff and managers can't switch */
  fixed: boolean;
  /** a staff member or manager with no location yet: they see nothing until an admin sets one */
  unassigned: boolean;
};

export async function adminScope(user: Pick<UserRow, "role" | "locationId">): Promise<Scope> {
  const locations = await getLocations();
  if (atOneLocation(user.role)) {
    const location = locations.find((l) => l.id === user.locationId) ?? null;
    return { locationId: location?.id ?? null, location, locations, fixed: true, unassigned: !location };
  }
  const picked = (await cookies()).get(ADMIN_LOCATION_COOKIE)?.value;
  const location = locations.find((l) => l.id === picked) ?? (locations.length === 1 ? locations[0] : null);
  return { locationId: location?.id ?? null, location, locations, fixed: false, unassigned: false };
}

/** For pages that work on one location at a time (prices, a location's settings): the scope's
    location, or for an admin looking at every location, the first. */
export function oneLocation(scope: Scope): Location | null {
  return scope.location ?? (scope.fixed ? null : scope.locations[0] ?? null);
}

/** May this person act on something at this location? Admins anywhere; others only at their own. */
export function worksAt(user: Pick<UserRow, "role" | "locationId">, locationId: string): boolean {
  if (atOneLocation(user.role)) return user.locationId === locationId;
  return user.role === "admin";
}
