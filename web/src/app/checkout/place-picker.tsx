"use client";
import { useId, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import type { DeliveryPlace } from "@/db/queries/menu";
import { fareFor } from "@/lib/orders";
import { cn } from "@/lib/utils";

function fold(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/* Type a name, pick the place. Popular places show before anything is typed. */
export function PlacePicker({ places, value, onChange, error }: {
  places: DeliveryPlace[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string | null;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(!value);
  const chosen = places.find((p) => p.id === value);

  const results = useMemo(() => {
    const q = fold(query);
    if (!q) return places.filter((p) => p.popular);
    const words = q.split(" ");
    return places.filter((p) => words.every((w) => fold(`${p.name} ${p.detail} ${p.keywords}`).includes(w))).slice(0, 6);
  }, [places, query]);

  if (chosen && !editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-display text-h3 font-extrabold uppercase">{chosen.name}</span>
          <span className="text-body text-ink-2">{chosen.detail}. About {chosen.km} km from the lounge.</span>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="h-10 shrink-0 rounded-full border-[1.5px] border-action px-4 text-[0.875rem] font-semibold text-action">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.875rem] font-semibold">Where should we bring it?</label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Estate, road or landmark"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-12 w-full rounded-xl border-[1.5px] border-line bg-card px-3.5 text-body focus-visible:border-action focus-visible:outline-none aria-invalid:border-danger"
      />
      {error && <p id={`${id}-err`} role="alert" className="text-fine font-semibold text-danger">{error}</p>}
      <span className="text-fine text-ink-2">{query ? (results.length ? "Pick the closest place" : "") : "Popular places"}</span>
      <ul className="flex flex-col gap-1.5">
        {results.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => { onChange(p.id); setEditing(false); setQuery(""); }}
              className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2 text-left", p.id === value ? "border-action bg-action-soft" : "border-line bg-card hover:border-action")}
            >
              <MapPin aria-hidden className="size-4 shrink-0 text-action" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{p.name}</span>
                <span className="truncate text-fine text-ink-2">{p.detail}</span>
              </span>
              <span className="shrink-0 text-fine text-ink-2">KES {fareFor(p.km)}</span>
            </button>
          </li>
        ))}
      </ul>
      {query && !results.length && (
        <p className="text-body text-ink-2">No place by that name yet. Try a nearby estate or road, or call the lounge.</p>
      )}
    </div>
  );
}
