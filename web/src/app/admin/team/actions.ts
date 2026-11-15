"use server";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { isBanned, NotAllowed, requirePermission } from "@/lib/session";
import { atOneLocation, isRole, ROLE_NAMES, type Role } from "@/lib/permissions";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";
import { getLocations } from "@/lib/locations";

export type TeamResult = { ok: true; message: string } | { ok: false; error: string };

type UserRow = typeof schema.user.$inferSelect;

/* Who can put whom where:
     admins    any role, at any location (staff and managers need one; admins work everywhere)
     managers  staff at their own location, and taking their own staff off the team */
async function setMember(target: UserRow, role: Role, locationInput: string | null, actor: UserRow): Promise<TeamResult> {
  if (target.id === actor.id) return { ok: false, error: "You can't change your own role or location. Ask an admin." };
  if (isBanned(target)) return { ok: false, error: "That number is blocked. Unblock it first." };

  let locationId = atOneLocation(role) ? locationInput : null;
  if (actor.role === "manager") {
    if (role !== "staff" && role !== "customer") return { ok: false, error: "Managers add staff. Ask an admin for other roles." };
    if (target.role !== "customer" && !(target.role === "staff" && target.locationId === actor.locationId)) {
      return { ok: false, error: "That person works elsewhere or has another role. Ask an admin." };
    }
    if (role === "staff") locationId = actor.locationId;
  }
  if (atOneLocation(role)) {
    const loc = (await getLocations()).find((l) => l.id === locationId);
    if (!loc) return { ok: false, error: "Choose which location they work at." };
  }
  if (target.role === role && target.locationId === locationId) {
    return { ok: true, message: `${target.name || displayPhone(target.phoneNumber!)} is already ${ROLE_NAMES[role].toLowerCase()} there.` };
  }

  await db.transaction(async (tx) => {
    if (target.role === "admin" && role !== "admin") {
      /* never leave Bamboo Cask without an admin */
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.user)
        .where(and(eq(schema.user.role, "admin"), ne(schema.user.id, target.id)));
      if (n === 0) throw new Error("last-admin");
    }
    await tx.update(schema.user).set({ role, locationId }).where(eq(schema.user.id, target.id));
    await audit(tx, actor, "role.set", { type: "user", id: target.id }, { role: target.role, locationId: target.locationId }, { role, locationId });
  });
  revalidatePath("/admin/team");
  const who = target.name || displayPhone(target.phoneNumber!);
  return { ok: true, message: role === "customer" ? `${who} is off the team` : `${who} is now ${ROLE_NAMES[role].toLowerCase()}` };
}

async function guarded(fn: (actor: UserRow) => Promise<TeamResult>): Promise<TeamResult> {
  try {
    const actor = await requirePermission({ team: ["assign"] });
    return await fn(actor);
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "last-admin") return { ok: false, error: "Bamboo Cask needs at least one admin. Make someone else an admin first." };
    throw e;
  }
}

/** Put a phone number on the team. The person must have signed in once. */
export async function addToTeam(phoneInput: string, roleInput: string, locationId: string | null): Promise<TeamResult> {
  return guarded(async (actor) => {
    const phone = normalizeKenyanPhone(phoneInput);
    if (!phone) return { ok: false, error: "Enter a Kenyan mobile number, like 0712 345 678." };
    if (!isRole(roleInput) || roleInput === "customer") return { ok: false, error: "Choose a role." };
    const [target] = await db.select().from(schema.user).where(eq(schema.user.phoneNumber, phone)).limit(1);
    if (!target) return { ok: false, error: `No account for ${displayPhone(phone)} yet. Ask them to sign in once on the site, then add them.` };
    return setMember(target, roleInput, typeof locationId === "string" ? locationId : null, actor);
  });
}

/** Change someone's role or location (or take them off the team: role "customer"). */
export async function updateMember(userId: string, roleInput: string, locationId: string | null): Promise<TeamResult> {
  return guarded(async (actor) => {
    if (!isRole(roleInput)) return { ok: false, error: "Choose a role." };
    const [target] = await db.select().from(schema.user).where(eq(schema.user.id, String(userId))).limit(1);
    if (!target) return { ok: false, error: "That account no longer exists." };
    return setMember(target, roleInput, typeof locationId === "string" ? locationId : null, actor);
  });
}
