import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { isAdult } from "@/lib/age";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** The signed-in customer and whether the Cask Room is open to them.
    The age check reads the user row from the database, not the session's cookie cache,
    so a date of birth saved a moment ago counts at once. */
export async function getViewer() {
  await connection(); // per request: reads cookies and today's date
  const s = await getSession();
  if (!s) return { user: null, profileComplete: false, adult: false };
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, s.user.id)).limit(1);
  if (!u) return { user: null, profileComplete: false, adult: false };
  return { user: u, profileComplete: !!u.dateOfBirth, adult: isAdult(u.dateOfBirth) };
}
