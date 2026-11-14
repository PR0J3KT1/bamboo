import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { isAdult } from "@/lib/age";
import { can, type statements } from "@/lib/permissions";
export { isPhoneBlocked } from "@/lib/blocked";

export type UserRow = typeof schema.user.$inferSelect;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function isBanned(u: Pick<UserRow, "banned" | "banExpires">, now = new Date()) {
  return !!u.banned && (!u.banExpires || u.banExpires > now);
}

/** The signed-in customer and whether the Cask Room is open to them.
    Everything is read from the user row in the database, not the session, so a date of birth
    saved a moment ago counts at once and a block or a removed role takes effect at once. */
export async function getViewer() {
  await connection(); // per request: reads cookies and today's date
  const s = await getSession();
  if (!s) return { user: null, profileComplete: false, adult: false };
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, s.user.id)).limit(1);
  if (!u || isBanned(u)) return { user: null, profileComplete: false, adult: false };
  return { user: u, profileComplete: !!u.dateOfBirth, adult: isAdult(u.dateOfBirth) };
}

type Perm = { [K in keyof typeof statements]?: (typeof statements)[K][number][] };

export class NotAllowed extends Error {
  constructor(public reason: "signed-out" | "forbidden") {
    super(reason === "signed-out" ? "Sign in first." : "Your account can't do that.");
  }
}

/** For admin pages and actions: the signed-in staff member, or NotAllowed. Call it in the page or
    layout AND in every server action: a layout doesn't protect the actions under it. */
export async function requirePermission(perm: Perm): Promise<UserRow> {
  const v = await getViewer();
  if (!v.user) throw new NotAllowed("signed-out");
  if (!can(v.user.role, perm)) throw new NotAllowed("forbidden");
  return v.user;
}

/** Like requirePermission, for pages: returns the user, or why they can't see the page. */
export async function checkPermission(perm: Perm): Promise<{ user: UserRow; denied?: undefined } | { user?: undefined; denied: NotAllowed["reason"] }> {
  try {
    return { user: await requirePermission(perm) };
  } catch (e) {
    if (e instanceof NotAllowed) return { denied: e.reason };
    throw e;
  }
}
