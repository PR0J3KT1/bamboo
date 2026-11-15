"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { Switch } from "@/components/admin/switch";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { displayPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { createLocation, saveLocation, type LocationInput } from "./location-actions";

export type LocationRow = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  phone: string | null;
  hours: string | null;
  mapUrl: string | null;
  tumabodaLocationId: string | null;
  active: boolean;
  orderingOpen: boolean;
};
export type Store = { id: string; name: string; address: string; latitude: number; longitude: number; isDefault: boolean };

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-panel p-4 md:p-5";
const input = "h-11 w-full rounded-xl border-[1.5px] border-line bg-card px-3";

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-fine text-ink-2">{hint}</span>}
    </label>
  );
}

/* The Bamboo Cask locations. Admins add and change any; a manager changes their own phone, hours
   and whether it takes online orders. */
export function LocationsPanel({ locations, stores, full, brand }: {
  locations: LocationRow[];
  stores: Store[];
  /* admins: every field, and adding locations */
  full: boolean;
  /* the brand's phone and hours, which a blank falls back to */
  brand: { phone: string; hours: string };
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className={card} aria-labelledby="locations-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="locations-h" className="font-display text-h3 font-extrabold uppercase">{full ? "Locations" : "Your location"}</h2>
        {full && editing !== "new" && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> Add a location
          </Button>
        )}
      </div>
      {full && (
        <p className="text-fine text-ink-2">
          A delivery goes to the open location nearest the customer; a collection to the one they choose. Each location sets its own prices and sold-out switches in Menu.
        </p>
      )}
      {editing === "new" && <LocationForm stores={stores} full brand={brand} locations={locations} onDone={() => setEditing(null)} />}
      <ul className="flex flex-col gap-3">
        {locations.map((l) => (
          <li key={l.id} className="rounded-xl border border-line bg-card p-3.5">
            {editing === l.id ? (
              <LocationForm location={l} stores={stores} full={full} brand={brand} locations={locations} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">Bamboo Cask {l.name}</span>
                    {!l.active && <Tag tone="neutral">Hidden from customers</Tag>}
                    {l.active && !l.orderingOpen && <Tag tone="warn">Not taking online orders</Tag>}
                  </span>
                  <span className="flex items-center gap-1 text-fine text-ink-2"><MapPin aria-hidden className="size-3.5" />{l.area}</span>
                  <span className="text-fine text-ink-2">
                    {displayPhone(l.phone || brand.phone)}{l.phone ? "" : " (the main number)"}. {l.hours || brand.hours}.
                  </span>
                  {full && (
                    <span className="text-fine text-ink-2">
                      Riders collect from {l.tumabodaLocationId ? (stores.find((s) => s.id === l.tumabodaLocationId)?.name ?? "a TumaBoda store") : "your default TumaBoda store"}.
                    </span>
                  )}
                </span>
                <Button size="sm" variant="outline" onClick={() => setEditing(l.id)}>Edit<span className="sr-only"> {l.name}</span></Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LocationForm({ location, stores, full, brand, locations, onDone }: {
  location?: LocationRow;
  stores: Store[];
  full: boolean;
  brand: { phone: string; hours: string };
  locations: LocationRow[];
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: location?.name ?? "",
    area: location?.area ?? "",
    lat: location ? String(location.lat) : "",
    lng: location ? String(location.lng) : "",
    phone: location?.phone ? displayPhone(location.phone) : "",
    hours: location?.hours ?? "",
    mapUrl: location?.mapUrl ?? "",
    tumabodaLocationId: location?.tumabodaLocationId ?? "",
    active: location?.active ?? true,
    orderingOpen: location?.orderingOpen ?? true,
  });
  const [copyFrom, setCopyFrom] = useState(locations[0]?.id ?? "");
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  function submit() {
    setError(null);
    const data: LocationInput = {
      name: f.name,
      area: f.area,
      lat: Number(f.lat),
      lng: Number(f.lng),
      phone: f.phone || null,
      hours: f.hours || null,
      mapUrl: f.mapUrl || null,
      tumabodaLocationId: f.tumabodaLocationId || null,
      active: f.active,
      orderingOpen: f.orderingOpen,
    };
    if (full && (f.lat.trim() === "" || f.lng.trim() === "" || !Number.isFinite(data.lat) || !Number.isFinite(data.lng))) {
      setError("Give the map position: latitude and longitude, or pick its TumaBoda store.");
      return;
    }
    start(async () => {
      const r = location ? await saveLocation(location.id, data) : await createLocation(data, copyFrom);
      if (!r.ok) return setError(r.error);
      toast(r.message);
      onDone();
      router.refresh();
    });
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {!location && <h3 className="font-bold">A new location</h3>}
      {full && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" hint="Customers see “Bamboo Cask” and this.">
            <input className={input} value={f.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} placeholder="Westlands" />
          </Field>
          <Field label="Where it is" hint="The street and area, as customers would say it.">
            <input className={input} value={f.area} maxLength={80} onChange={(e) => set({ area: e.target.value })} placeholder="Woodvale Grove, Westlands" />
          </Field>
        </div>
      )}
      {full && (
        <Field
          label="TumaBoda store riders collect from"
          hint={stores.length ? "Picking one also fills in the map position." : "Add the store in the TumaBoda business app first; without one, riders collect from your default store."}
        >
          <select
            className={input}
            value={f.tumabodaLocationId}
            onChange={(e) => {
              const s = stores.find((x) => x.id === e.target.value);
              set({ tumabodaLocationId: e.target.value, ...(s ? { lat: String(s.latitude), lng: String(s.longitude) } : {}) });
            }}
          >
            <option value="">Your default TumaBoda store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}, {s.address}{s.isDefault ? " (default)" : ""}</option>
            ))}
          </select>
        </Field>
      )}
      {full && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Latitude" hint="In Google Maps, press and hold the lounge to copy both numbers.">
            <input className={input} inputMode="decimal" value={f.lat} onChange={(e) => set({ lat: e.target.value })} placeholder="-1.2676" />
          </Field>
          <Field label="Longitude">
            <input className={input} inputMode="decimal" value={f.lng} onChange={(e) => set({ lng: e.target.value })} placeholder="36.8108" />
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone and WhatsApp" hint={`Blank: the main number, ${displayPhone(brand.phone)}.`}>
          <input className={input} type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0712 345 678" />
        </Field>
        <Field label="Opening hours" hint={`Blank: “${brand.hours}”.`}>
          <input className={input} value={f.hours} maxLength={80} onChange={(e) => set({ hours: e.target.value })} placeholder="Open daily, 8am till late" />
        </Field>
      </div>
      {full && (
        <Field label="Map link (optional)" hint="Blank: a Google Maps search for the address.">
          <input className={input} value={f.mapUrl} maxLength={300} onChange={(e) => set({ mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
        </Field>
      )}
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-3 font-semibold">
          <Switch checked={f.orderingOpen} onCheckedChange={(v) => set({ orderingOpen: !!v })} />
          {f.orderingOpen ? "Taking online orders" : "Not taking online orders (deliveries go to the next nearest)"}
        </label>
        {full && (
          <label className="flex items-center gap-3 font-semibold">
            <Switch checked={f.active} onCheckedChange={(v) => set({ active: !!v })} />
            {f.active ? "Open to customers" : "Hidden from customers"}
          </label>
        )}
      </div>
      {!location && locations.length > 0 && (
        <Field label="Start its menu from" hint="Same dishes, prices and sold-out switches; its manager then changes them.">
          <select className={input} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
      )}
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : location ? "Save location" : "Add the location"}</Button>
        <Button variant="quiet" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
