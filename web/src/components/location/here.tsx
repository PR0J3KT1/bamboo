import { getOpenLocations, hereFacts } from "@/lib/locations";
import { LocationSwitch } from "./location-switch";

/* The customer's lounge, for the headers: where it is and when it's open. Reads a cookie, so
   each sits in its own Suspense boundary. */

export async function HereLine({ prefix = "" }: { prefix?: string }) {
  const f = await hereFacts();
  return (
    <>
      {prefix}
      {f.where}. {f.hours}.
    </>
  );
}

/** "Ordering from" a lounge, with a choice; nothing at all while there's only one. */
export async function LocationPicker({ label = "Ordering from" }: { label?: string }) {
  const [open, f] = await Promise.all([getOpenLocations(), hereFacts()]);
  if (open.length < 2) return null;
  return <LocationSwitch label={label} current={f.loc.id} locations={open.map((l) => ({ id: l.id, name: l.name, area: l.area }))} />;
}
