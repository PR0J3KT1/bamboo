"use server";
import { updateTag } from "next/cache";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { getSettings, SettingsSchema, type LoungeSettings } from "@/lib/settings";
import { NotAllowed, requirePermission } from "@/lib/session";

export type SaveSettingsResult = { ok: true; message: string } | { ok: false; error: string; field?: string };

/** Save the lounge's settings. Admins only; the change is in the audit log with before and after. */
export async function saveSettings(raw: LoungeSettings): Promise<SaveSettingsResult> {
  let me;
  try {
    me = await requirePermission({ settings: ["edit"] });
  } catch (e) {
    if (e instanceof NotAllowed) return { ok: false, error: e.message };
    throw e;
  }
  const p = SettingsSchema.safeParse(raw);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: i?.message ?? "Something didn't look right.", field: i?.path.join(".") };
  }
  const before = await getSettings();
  const by = me.name || me.phoneNumber || "Admin";
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.settings)
      .values({ key: "lounge", value: p.data, updatedBy: by })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: p.data, updatedBy: by } });
    await audit(tx, me, "settings.save", { type: "settings", id: "lounge" }, before, p.data);
  });
  updateTag("settings");
  return { ok: true, message: "Settings saved" };
}
