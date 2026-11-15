"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { chooseLocation } from "@/app/actions/orders";

/* A choice of lounge on the dark header. Choosing one shows its menu and prices; a delivery still
   comes from the lounge nearest the drop-off, which checkout says. */
export function LocationSwitch({ label, current, locations }: { label: string; current: string; locations: { id: string; name: string; area: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex h-11 items-center gap-2 self-start rounded-full bg-on-grove/10 pr-1 pl-3.5 text-on-grove">
      <MapPin aria-hidden className="size-4 text-lime" />
      <span className="text-[0.875rem] text-on-grove-2">{label}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            if ((await chooseLocation(id)).ok) router.refresh();
          });
        }}
        className="h-9 cursor-pointer rounded-full bg-on-grove px-3 font-semibold text-grove disabled:opacity-60"
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}, {l.area}
          </option>
        ))}
      </select>
    </label>
  );
}
