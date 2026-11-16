import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { NoAccess, Unassigned } from "@/components/admin-shell/no-access";
import { can } from "@/lib/permissions";
import { getLocations } from "@/lib/locations";
import { listStores } from "@/lib/tumaboda";
import { LocationsPanel } from "./locations-form";
import { SettingsForm } from "./settings-form";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Settings" };

async function Settings() {
  const { user: me, denied } = await checkPermission({ location: ["edit"] });
  if (denied) return <NoAccess reason={denied} path="/admin/settings" />;
  const brand = can(me.role, { settings: ["edit"] });
  const full = can(me.role, { location: ["create"] });
  const [settings, all, stores, [row]] = await Promise.all([getSettings(), getLocations(), full ? listStores() : Promise.resolve([]), db.select({ by: schema.settings.updatedBy, at: schema.settings.updatedAt }).from(schema.settings).where(eq(schema.settings.key, "lounge")).limit(1)]);
  const mine = full ? all : all.filter((l) => l.id === me.locationId);
  if (!full && !mine.length) return <Unassigned />;
  const last = row ? `Last saved by ${row.by ?? "an admin"}, ${row.at.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi" })}.` : "Not saved yet: these are the starting values.";
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-5 md:px-5">
      <div>
        <h1 className="font-display text-h2 font-extrabold uppercase">Settings</h1>
        <p className="text-ink-2">What customers see about the lounge, and what&rsquo;s open online.{brand ? ` ${last}` : ""}</p>
      </div>
      <LocationsPanel
        locations={mine.map((l) => ({ id: l.id, name: l.name, area: l.area, lat: l.lat, lng: l.lng, phone: l.phone, hours: l.hours, mapUrl: l.mapUrl, tumabodaLocationId: l.tumabodaLocationId, active: l.active, orderingOpen: l.orderingOpen, rooms: l.rooms, extras: l.extras }))}
        stores={stores.map((s) => ({ id: s.id, name: s.name, address: s.address, latitude: s.latitude, longitude: s.longitude, isDefault: s.is_default }))}
        full={full}
        brand={{ phone: settings.phone, hours: settings.hours }}
      />
      {brand && <SettingsForm initial={settings} />}
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loader label="Loading settings" />}>
      <Settings />
    </Suspense>
  );
}
