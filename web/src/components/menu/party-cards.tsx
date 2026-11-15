"use client";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCatalog } from "@/components/order/catalog";
import { buildPlan, fromOccasion, hoursText, MEATS, OCCASIONS, occasionPhoto, perHead, type PartyItem } from "@/lib/party";

/* Party packages on the menu: the eight occasions with what each comes to, worked out from this
   viewer's menu (food, sodas and water only for under-18s). Each opens the planner. */
export function PartyCards({ id, title, note }: { id: string; title: string; note: string | null }) {
  const { catalog } = useCatalog();
  const items = useMemo(() => new Map<string, PartyItem>(catalog.items.map((i) => [i.id, i])), [catalog]);
  const adult = catalog.items.some((i) => i.alcohol);
  const plans = useMemo(() => OCCASIONS.map((o) => ({ o, plan: buildPlan(fromOccasion(o), items) })), [items]);

  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="paper-bg scroll-mt-16 rounded-3xl border border-line p-4 outline-none md:p-6 lg:scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-h`} className="font-display text-h2 font-extrabold uppercase md:text-[2.5rem]">{title}</h2>
          <p className="mt-1 max-w-[60ch] font-serif text-[1rem] text-ink-2 italic md:text-lead">
            {note ?? "Pick the occasion and the number of guests."} The planner works out the choma, the sides{adult ? " and the drinks" : ", the sodas and the water"}, at the lounge&rsquo;s prices.
          </p>
        </div>
        <Link href="/party" className="brass-btn inline-flex h-12 items-center rounded-full px-5 font-bold">Plan a party</Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map(({ o, plan }) => {
          const ph = occasionPhoto(o.id, adult);
          return (
            <li key={o.id} className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-card" style={{ "--hue": o.hue } as React.CSSProperties}>
              <Link href={`/party?occ=${o.id}`} className="group relative block aspect-[4/3] overflow-hidden" aria-label={`Plan a ${o.name}`}>
                <Image src={ph.src} alt="" fill sizes="(min-width: 1280px) 220px, (min-width: 640px) 40vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
                <span className="absolute inset-x-0 bottom-0 h-1.5 bg-[var(--hue)]" />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-fine font-semibold text-white">{o.guests} guests</span>
              </Link>
              <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                <p className="font-serif text-[0.9375rem] text-ink-2 italic">{o.sw}</p>
                <h3 className="font-display text-[1.375rem] leading-none font-extrabold uppercase">{o.name}</h3>
                <p className="text-[0.875rem] text-ink-2">{o.line}</p>
                <p className="text-fine text-ink-3">{hoursText(o.hours)}, {o.meats.map((m) => MEATS.find((x) => x[0] === m)?.[1]).join(" and ")}</p>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-1">
                  <span className="flex flex-col">
                    <span className="figures text-[1.25rem] leading-none">KES {plan.total.toLocaleString("en-KE")}</span>
                    <span className="text-fine text-ink-2">about KES {perHead(plan.total, o.guests).toLocaleString("en-KE")} a head</span>
                  </span>
                  <Link href={`/party?occ=${o.id}`} className="h-10 shrink-0 rounded-full border-[1.5px] border-action px-3.5 leading-[2.3rem] font-semibold whitespace-nowrap text-action">Plan it</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-fine text-ink-3">
        Photos from Pexels:{" "}
        {OCCASIONS.filter((o) => occasionPhoto(o.id, adult).pexels).map((o, i) => (
          <span key={o.id}>{i ? ", " : ""}<a href={occasionPhoto(o.id, adult).pexels!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.name}</a></span>
        ))}
        {OCCASIONS.some((o) => !occasionPhoto(o.id, adult).pexels) ? ". The others are the lounge’s own." : "."}
      </p>
    </section>
  );
}
