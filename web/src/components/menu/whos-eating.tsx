"use client";
import { useState } from "react";
import Image from "next/image";
import { useCatalog } from "@/components/order/catalog";
import { useToast } from "@/components/ui/toast";
import { Price } from "@/components/ui/price";
import { basket } from "@/lib/basket";
import { cn } from "@/lib/utils";

const WHO = [
  { id: "one", name: "Just me" },
  { id: "two", name: "Two of us" },
  { id: "table", name: "The table", sub: "4 to 6" },
];

/* "Who's eating?": plates put together from the menu for one, two or the table. Each costs what
   its dishes cost on their own, and goes into the order in one tap, part by part. */
export function WhosEating({ id, title, note }: { id: string; title: string; note: string | null }) {
  const { catalog, byId } = useCatalog();
  const toast = useToast();
  const [who, setWho] = useState<string | null>(null);
  const plates = catalog.bundles.filter((b) => !who || b.who === who);
  if (!catalog.bundles.length) return null;

  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="paper-bg scroll-mt-16 rounded-3xl border border-line p-4 outline-none md:p-6 lg:scroll-mt-6">
      <h2 id={`${id}-h`} className="font-display text-h2 font-extrabold uppercase md:text-[2.5rem]">{title}</h2>
      {note && <p className="mt-1 font-serif text-[1rem] text-ink-2 italic md:text-lead">{note}</p>}
      <div role="group" aria-label="Who's eating" className="mt-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={!who} onClick={() => setWho(null)} className={cn("h-10 rounded-full border-[1.5px] px-4 font-semibold", !who ? "border-action bg-action text-on-action" : "border-line bg-card")}>All</button>
        {WHO.map((w) => (
          <button key={w.id} type="button" aria-pressed={who === w.id} onClick={() => setWho(w.id)} className={cn("h-10 rounded-full border-[1.5px] px-4 font-semibold", who === w.id ? "border-action bg-action text-on-action" : "border-line bg-card")}>
            {w.name}{w.sub && <span className="font-normal opacity-80">, {w.sub}</span>}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plates.map((b) => {
          const parts = b.parts.map((p) => ({ ...p, item: byId.get(p.itemId)! }));
          const total = parts.reduce((s, p) => s + p.item.price * p.qty, 0);
          const forWho = WHO.find((w) => w.id === b.who);
          return (
            <li key={b.id} className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-card">
              {b.photo && (
                <div className="relative aspect-[16/9]">
                  <Image src={b.photo.src} alt={b.photo.alt} fill sizes="(min-width: 1280px) 260px, (min-width: 640px) 40vw, 90vw" className="object-cover" />
                  {forWho && <span className="absolute top-2.5 left-2.5 rounded-full bg-grove/85 px-3 py-1 text-fine font-semibold text-on-grove">{forWho.name}</span>}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h3 className="font-display text-[1.375rem] leading-none font-extrabold uppercase">{b.name}</h3>
                {!b.photo && forWho && <span className="text-fine font-semibold text-action">{forWho.name}</span>}
                <ul className="text-[0.875rem] text-ink-2">
                  {parts.map((p) => (
                    <li key={p.itemId}>{p.qty > 1 ? `${p.qty} × ` : ""}{p.item.name}</li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <Price amount={total} />
                  <button
                    type="button"
                    onClick={() => {
                      for (const p of parts) basket.add(p.itemId, p.item.options?.[0] ?? null, p.qty);
                      toast(`${b.name} added`);
                    }}
                    className="h-11 rounded-full bg-action px-4 font-semibold text-on-action"
                  >
                    Add the plate
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
