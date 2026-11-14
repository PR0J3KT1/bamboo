import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

export const BLOCKED_MESSAGE = "This number can't order online. Call the lounge if you think that's a mistake.";

/** Is this phone number blocked? Checked before sending a sign-in code and before a guest order. */
export async function isPhoneBlocked(e164: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(and(eq(schema.user.phoneNumber, e164), eq(schema.user.banned, true), or(isNull(schema.user.banExpires), gt(schema.user.banExpires, new Date()))))
    .limit(1);
  return rows.length > 0;
}
