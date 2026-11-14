"use server";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { isBanned, NotAllowed, requirePermission } from "@/lib/session";
import { isRole, ROLE_NAMES, type Role } from "@/lib/permissions";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";

export type TeamResult = { ok: true; message: string } | { ok: false; error: string };

async function setRoleFor(target: typeof schema.user.$inferSelect, role: Role, actor: typeof schema.user.$inferSelect): Promise<TeamResult> {
  if (target.id === actor.id) return { ok: false, error: "You can't change your own role. Ask another admin." };
  if (isBanned(target)) return { ok: false, error: "That number is blocked. Unblock it first." };
  if (target.role === role) return { ok: true, message: `${target.name || displayPhone(target.phoneNumber!)} is already ${ROLE_NAMES[role].toLowerCase()}.` };

  await db.transaction(async (tx) => {
    if (target.role === "admin" && role !== "admin") {
      /* never leave the lounge without an admin */
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.user)
        .where(and(eq(schema.user.role, "admin"), ne(schema.user.id, target.id)));
      if (n === 0) throw new Error("last-admin");
    }
    await tx.update(schema.user).set({ role }).where(eq(schema.user.id, target.id));
    await audit(tx, actor, "role.set", { type: "user", id: target.id }, { role: target.role }, { role });
  });
  revalidatePath("/admin/team");
  const who = target.name || displayPhone(target.phoneNumber!);
  return { ok: true, message: role === "customer" ? `${who} is off the team` : `${who} is now ${ROLE_NAMES[role].toLowerCase()}` };
}

async function guarded(fn: (actor: typeof schema.user.$inferSelect) => Promise<TeamResult>): Promise<TeamResult> {
  try {
    const actor = await requirePermission({ user: ["set-role"] });
    return await fn(actor);
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "last-admin") return { ok: false, error: "The lounge needs at least one admin. Make someone else an admin first." };
    throw e;
  }
}

/** Give a phone number a role. The person must have signed in once. */
export async function addToTeam(phoneInput: string, roleInput: string): Promise<TeamResult> {
  return guarded(async (actor) => {
    const phone = normalizeKenyanPhone(phoneInput);
    if (!phone) return { ok: false, error: "Enter a Kenyan mobile number, like 0712 345 678." };
    if (!isRole(roleInput) || roleInput === "customer") return { ok: false, error: "Choose staff or admin." };
    const [target] = await db.select().from(schema.user).where(eq(schema.user.phoneNumber, phone)).limit(1);
    if (!target) return { ok: false, error: `No account for ${displayPhone(phone)} yet. Ask them to sign in once on the site, then add them.` };
    return setRoleFor(target, roleInput, actor);
  });
}

export async function changeRole(userId: string, roleInput: string): Promise<TeamResult> {
  return guarded(async (actor) => {
    if (!isRole(roleInput)) return { ok: false, error: "Choose a role." };
    const [target] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
    if (!target) return { ok: false, error: "That account no longer exists." };
    return setRoleFor(target, roleInput, actor);
  });
}
