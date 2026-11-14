"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";
import { NotAllowed, requirePermission, type UserRow } from "@/lib/session";

export type BlockResult = { ok: true; message: string } | { ok: false; error: string };

async function guarded(fn: (me: UserRow) => Promise<BlockResult>): Promise<BlockResult> {
  try {
    return await fn(await requirePermission({ user: ["ban"] }));
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
}

/** Block a number from ordering online and signing in. An account goes through Better Auth's
    admin plugin, which also signs it out everywhere; a guest number goes into blocked_numbers. */
export async function blockNumber(phoneInput: string, reasonInput: string): Promise<BlockResult> {
  return guarded(async (me) => {
    const phone = normalizeKenyanPhone(phoneInput);
    if (!phone) return { ok: false, error: "That isn't a Kenyan mobile number." };
    const reason = String(reasonInput ?? "").trim().slice(0, 200);
    if (!reason) return { ok: false, error: "Say why. Other admins see it." };
    if (phone === me.phoneNumber) return { ok: false, error: "You can't block your own number." };

    const [u] = await db.select().from(schema.user).where(eq(schema.user.phoneNumber, phone)).limit(1);
    if (u) {
      if (u.role === "staff" || u.role === "admin") return { ok: false, error: "Take them off the team first, in Team." };
      await auth.api.banUser({ body: { userId: u.id, banReason: reason }, headers: await headers() });
      await audit(db, me, "user.ban", { type: "user", id: u.id }, { banned: !!u.banned }, { banned: true, reason });
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(schema.blockedNumbers).values({ phone, reason, byName: me.name || me.phoneNumber || "Admin" }).onConflictDoUpdate({ target: schema.blockedNumbers.phone, set: { reason } });
        await audit(tx, me, "phone.block", { type: "phone", id: phone }, null, { reason });
      });
    }
    revalidatePath("/admin/customers");
    return { ok: true, message: `${displayPhone(phone)} is blocked` };
  });
}

export async function unblockNumber(phoneInput: string): Promise<BlockResult> {
  return guarded(async (me) => {
    const phone = normalizeKenyanPhone(phoneInput);
    if (!phone) return { ok: false, error: "That isn't a Kenyan mobile number." };
    const [u] = await db.select().from(schema.user).where(eq(schema.user.phoneNumber, phone)).limit(1);
    if (u?.banned) {
      await auth.api.unbanUser({ body: { userId: u.id }, headers: await headers() });
      await audit(db, me, "user.unban", { type: "user", id: u.id }, { banned: true, reason: u.banReason }, { banned: false });
    }
    const removed = await db.delete(schema.blockedNumbers).where(eq(schema.blockedNumbers.phone, phone)).returning();
    if (removed.length) await audit(db, me, "phone.unblock", { type: "phone", id: phone }, { reason: removed[0].reason }, null);
    revalidatePath("/admin/customers");
    return { ok: true, message: `${displayPhone(phone)} can order again` };
  });
}
