import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { NoAccess } from "@/components/admin-shell/no-access";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

async function Settings() {
  const { denied } = await checkPermission({ settings: ["edit"] });
  if (denied) return <NoAccess reason={denied} path="/admin/settings" />;
  const [settings, [row]] = await Promise.all([getSettings(), db.select({ by: schema.settings.updatedBy, at: schema.settings.updatedAt }).from(schema.settings).where(eq(schema.settings.key, "lounge")).limit(1)]);
  const last = row ? `Last saved by ${row.by ?? "an admin"}, ${row.at.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi" })}.` : "Not saved yet: these are the starting values.";
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-5 md:px-5">
      <div>
        <h1 className="font-display text-h2 font-extrabold uppercase">Settings</h1>
        <p className="text-ink-2">What customers see about the lounge, and what&rsquo;s open online. {last}</p>
      </div>
      <SettingsForm initial={settings} />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading settings…</p>}>
      <Settings />
    </Suspense>
  );
}
