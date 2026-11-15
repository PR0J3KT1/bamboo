"use server";
import { cookies } from "next/headers";
import { requirePermission, NotAllowed } from "@/lib/session";
import { atOneLocation } from "@/lib/permissions";
import { getLocations } from "@/lib/locations";
import { ADMIN_LOCATION_COOKIE } from "@/lib/scope";

/** An admin picks which location the admin shows ("all" for every one). Staff and managers are
    always at their own, so this does nothing for them. */
export async function pickAdminLocation(id: string): Promise<{ ok: boolean }> {
  try {
    const me = await requirePermission({ order: ["view"] });
    if (atOneLocation(me.role)) return { ok: false };
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false };
    throw e;
  }
  const jar = await cookies();
  if (id === "all") {
    jar.delete(ADMIN_LOCATION_COOKIE);
    return { ok: true };
  }
  if (!(await getLocations()).some((l) => l.id === id)) return { ok: false };
  jar.set(ADMIN_LOCATION_COOKIE, id, { path: "/admin", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}
