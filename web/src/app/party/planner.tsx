"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { useCatalog } from "@/components/order/catalog";
import { useToast } from "@/components/ui/toast";
import { WhatsAppIcon } from "@/components/brand";
import { basket } from "@/lib/basket";
import { whatsapp } from "@/lib/lounge";
import {
  budgetNote, buildPlan, CROWDS, EXTRAS, fromOccasion, HOURS, hoursText, itemLabel, MAX_GUESTS, MEATS, MIN_GUESTS, occasion, OCCASIONS, occasionPhoto,
  perHead, planText, SIDES, SPIRITS, STEPS, TIERS, type Crowd, type Extra, type Meat, type PartyItem, type PlanInput, type Side, type Spirit, type Tier,
} from "@/lib/party";
import { cn } from "@/lib/utils";

const KEY = "bc-app-party";
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
type Saved = { I: PlanInput; swaps: Record<string, string>; adj: Record<string, number>; step: number; chama: number; budget: number | null };

function load(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    return s?.I?.meats ? s : null;
  } catch {
    return null;
  }
}

function Chips<T extends string>({ label, all, on, toggle }: { label: string; all: [T, string][]; on: T[]; toggle: (k: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {all.map(([k, name]) => (
        <button key={k} type="button" aria-pressed={on.includes(k)} onClick={() => toggle(k)} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 font-semibold", on.includes(k) ? "border-action bg-action-soft text-action" : "border-line bg-card")}>
          {on.includes(k) && <Check aria-hidden className="size-4" />}
          {name}
        </button>
      ))}
    </div>
  );
}

function Step({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-full border border-line bg-card p-1">
      <button type="button" aria-label={`One fewer, ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex size-9 items-center justify-center rounded-full bg-ground-2 disabled:opacity-40"><Minus aria-hidden className="size-4" /></button>
      <span className="figures w-9 text-center text-[1.125rem]" aria-live="polite">{value}</span>
      <button type="button" aria-label={`One more, ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-9 items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40"><Plus aria-hidden className="size-4" /></button>
    </div>
  );
}

/* The planner in five steps: the occasion, guests, food and drinks, budget, and the package. Every
   choice redraws the package; numbers changed by hand on the last step are kept until a choice
   above changes. The plan is remembered in this browser. */
export function Planner({ start, phone, ordering }: { start: string | null; phone: string; ordering: boolean }) {
  const { catalog } = useCatalog();
  const router = useRouter();
  const toast = useToast();
  const items = useMemo(() => new Map<string, PartyItem>(catalog.items.map((i) => [i.id, i])), [catalog]);
  const adult = catalog.items.some((i) => i.alcohol);
  const top = useRef<HTMLDivElement>(null);

  const chosen = start && OCCASIONS.some((o) => o.id === start) ? start : null;
  const [P, setP] = useState<Saved>(() => ({ I: fromOccasion(occasion(chosen ?? "birthday")), swaps: {}, adj: {}, step: chosen ? 1 : 0, chama: 1, budget: null }));
  /* no occasion in the address: pick up the plan saved in this browser, after the first render so
     the server's page and the browser's agree. Read before the save below writes over it. */
  useEffect(() => {
    if (chosen) return;
    const saved = load();
    if (saved) Promise.resolve().then(() => setP(saved));
  }, [chosen]);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(P));
    } catch {
      /* private mode: the plan lasts for this page */
    }
  }, [P]);

  const plan = useMemo(() => buildPlan(P.I, items, P.swaps, P.adj), [P.I, P.swaps, P.adj, items]);
  const o = occasion(P.I.occ);
  const last = P.step === STEPS.length - 1;
  const go = (step: number) => {
    setP((p) => ({ ...p, step }));
    top.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  /* a choice above the package redraws it from scratch */
  const change = (patch: Partial<PlanInput>) => setP((p) => ({ ...p, I: { ...p.I, ...patch }, adj: {} }));
  const toggle = <T extends string>(list: T[], k: T) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  function addAll() {
    let n = 0;
    for (const l of plan.lines) {
      if (l.qty <= 0) continue;
      const it = items.get(l.id)!;
      basket.add(l.id, it.options?.[0] ?? null, l.qty);
      n += l.qty;
    }
    toast(`${n} items added to your order`);
    router.push("/checkout");
  }

  const body = [
    /* the occasion */
    <div key="occ" className="flex flex-col gap-4">
      <h2 className="text-lead font-bold">What&rsquo;s the occasion? <span className="font-normal text-ink-2">Pick one and the planner fills in the rest.</span></h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {OCCASIONS.map((x) => {
          const ph = occasionPhoto(x.id, adult);
          const on = x.id === P.I.occ;
          return (
            <button key={x.id} type="button" aria-pressed={on} onClick={() => { setP((p) => ({ ...p, I: fromOccasion(x, p.I.tier), adj: {}, step: 1 })); top.current?.scrollIntoView({ block: "start" }); }} className={cn("flex flex-col overflow-hidden rounded-2xl border-[1.5px] bg-card text-left", on ? "border-action ring-2 ring-action" : "border-line hover:border-action")}>
              <span className="relative block aspect-[4/3]">
                <Image src={ph.small} alt="" fill sizes="(min-width: 768px) 240px, 45vw" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: x.hue }} />
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <b className="font-display text-[1.125rem] leading-none font-extrabold uppercase">{x.name}</b>
                <small className="font-serif text-ink-2 italic">{x.sw}</small>
                <small className="text-fine text-ink-3">{x.guests} guests, {hoursText(x.hours)}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>,

    /* guests */
    <div key="guests" className="flex flex-col gap-5">
      <h2 className="text-lead font-bold">How many guests? <span className="font-normal text-ink-2">Count everyone{adult ? ", even the ones not drinking" : ""}.</span></h2>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="One fewer guest" disabled={P.I.guests <= MIN_GUESTS} onClick={() => change({ guests: P.I.guests - 1 })} className="flex size-14 items-center justify-center rounded-full bg-ground-2 disabled:opacity-40"><Minus aria-hidden className="size-6" /></button>
          <output className="figures w-24 text-center text-[3rem] leading-none" aria-live="polite">{P.I.guests}</output>
          <button type="button" aria-label="One more guest" disabled={P.I.guests >= MAX_GUESTS} onClick={() => change({ guests: P.I.guests + 1 })} className="flex size-14 items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40"><Plus aria-hidden className="size-6" /></button>
        </div>
        <input type="range" aria-label="Guests" min={MIN_GUESTS} max={MAX_GUESTS} value={P.I.guests} onChange={(e) => change({ guests: Number(e.target.value) })} className="min-w-48 flex-1 accent-[var(--action)]" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">How long does it go?</h3>
        <div role="group" aria-label="Hours" className="flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <button key={h} type="button" aria-pressed={P.I.hours === h} onClick={() => change({ hours: h })} className={cn("h-10 rounded-full border-[1.5px] px-3.5 font-semibold", P.I.hours === h ? "border-action bg-action text-on-action" : "border-line bg-card")}>{hoursText(h)}</button>
          ))}
        </div>
      </div>
      {adult && (
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Not drinking <span className="font-normal text-ink-2">drivers, wazee and the teetotal</span></h3>
          <div className="flex flex-wrap items-center gap-4">
            <input type="range" aria-label="Percent not drinking" min={0} max={60} step={5} value={P.I.sober} onChange={(e) => change({ sober: Number(e.target.value) })} className="min-w-48 flex-1 accent-[var(--action)]" />
            <output className="font-semibold">{P.I.sober}%, {plan.sober} {plan.sober === 1 ? "guest" : "guests"}</output>
          </div>
        </div>
      )}
    </div>,

    /* food and drinks */
    <div key="food" className="flex flex-col gap-5">
      <h2 className="text-lead font-bold">Food and drinks <span className="font-normal text-ink-2">The meat, the sides{adult ? ", and how the crowd drinks" : ""}.</span></h2>
      <div className="flex flex-col gap-2"><h3 className="font-bold">The meat <span className="font-normal text-ink-2">shared between the ones you pick</span></h3><Chips label="Meat" all={MEATS} on={P.I.meats} toggle={(k: Meat) => change({ meats: toggle(P.I.meats, k) })} /></div>
      <div className="flex flex-col gap-2"><h3 className="font-bold">Sides</h3><Chips label="Sides" all={SIDES.map(([k, n]) => [k, n] as [Side, string])} on={P.I.sides} toggle={(k: Side) => change({ sides: toggle(P.I.sides, k) })} /></div>
      {adult ? (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="font-bold">How does the crowd drink?</h3>
            <div role="group" aria-label="The crowd" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(CROWDS) as Crowd[]).map((k) => {
                const c = CROWDS[k];
                return (
                  <button key={k} type="button" aria-pressed={P.I.crowd === k} onClick={() => change({ crowd: k })} className={cn("flex flex-col items-start gap-0.5 rounded-2xl border-[1.5px] p-3 text-left", P.I.crowd === k ? "border-action bg-action-soft" : "border-line bg-card")}>
                    <b>{c.name}</b>
                    <small className="font-serif text-ink-2 italic">{c.sw}</small>
                    <small className="text-fine text-ink-3">{Math.round(c.split.beer * 100)}% beer, {Math.round(c.split.wine * 100)}% wine, {Math.round(c.split.spirits * 100)}% spirits</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2"><h3 className="font-bold">The spirits <span className="font-normal text-ink-2">pick as many as you like</span></h3><Chips label="Spirits" all={SPIRITS} on={P.I.spirits} toggle={(k: Spirit) => change({ spirits: toggle(P.I.spirits, k) })} /></div>
          <div className="flex flex-col gap-2"><h3 className="font-bold">Extras</h3><Chips label="Extras" all={(Object.keys(EXTRAS) as Extra[]).map((k) => [k, EXTRAS[k][0]] as [Extra, string])} on={P.I.extras} toggle={(k: Extra) => change({ extras: toggle(P.I.extras, k) })} /></div>
        </>
      ) : (
        <p className="rounded-2xl bg-ground-2 p-4">Sodas and water for everyone. Drinks from the Cask Room are for accounts aged 18 or over.</p>
      )}
    </div>,

    /* budget */
    <div key="budget" className="flex flex-col gap-5">
      <h2 className="text-lead font-bold">The budget <span className="font-normal text-ink-2">{adult ? "The same party, three ways to pour it." : "The package is food, sodas and water."}</span></h2>
      {adult && (
        <div role="group" aria-label="How to pour it" className="grid gap-2 md:grid-cols-3">
          {(Object.keys(TIERS) as Tier[]).map((k) => {
            const t = TIERS[k];
            const b = buildPlan({ ...P.I, tier: k }, items);
            return (
              <button key={k} type="button" aria-pressed={P.I.tier === k} onClick={() => setP((p) => ({ ...p, I: { ...p.I, tier: k }, swaps: {}, adj: {} }))} className={cn("flex flex-col items-start gap-1 rounded-2xl border-[1.5px] p-4 text-left", P.I.tier === k ? "border-action bg-action-soft" : "border-line bg-card")}>
                <small className="font-serif text-ink-2 italic">{t.sw}</small>
                <b className="font-display text-[1.375rem] leading-none font-extrabold uppercase">{t.name}</b>
                <span className="text-fine text-ink-2">{t.line}</span>
                <span className="figures mt-1 text-[1.375rem]">{kes(b.total)}</span>
                <span className="text-fine text-ink-3">bar {kes(b.bar)}</span>
              </button>
            );
          })}
        </div>
      )}
      <label className="flex max-w-sm flex-col gap-1.5">
        <span className="font-bold">Have a fixed budget? <span className="font-normal text-ink-2">optional</span></span>
        <span className="flex h-12 items-center gap-2 rounded-full border border-line bg-card px-4">
          <span className="text-fine font-bold text-ink-2">KES</span>
          <input type="number" inputMode="numeric" min={0} step={500} placeholder="e.g. 30000" value={P.budget ?? ""} onChange={(e) => setP((p) => ({ ...p, budget: e.target.value ? Number(e.target.value) : null }))} className="min-w-0 flex-1 bg-transparent outline-none" />
        </span>
      </label>
      {(() => {
        const b = budgetNote(P.budget, plan.total, P.I.tier);
        return <p role="status" className={cn(b?.over ? "font-semibold text-danger-ink" : "text-ink-2")}>{b?.text ?? "Leave it empty to see the full package."}</p>;
      })()}
    </div>,

    /* the package */
    <div key="pkg" className="flex flex-col gap-5">
      <h2 className="text-lead font-bold">Your package is ready. <span className="font-normal text-ink-2">{adult ? "Swap a bottle, change a number." : "Change any number to suit."}</span></h2>
      {(["food", "bar", "soft"] as const).map((g) => {
        const ls = plan.lines.filter((l) => l.group === g);
        if (!ls.length) return null;
        return (
          <section key={g} className="flex flex-col gap-2">
            <h3 className="font-bold">{g === "food" ? "From the kitchen" : g === "bar" ? "From the bar" : "Soft drinks and water"}</h3>
            <ul className="flex flex-col divide-y divide-line-2 rounded-2xl border border-line bg-panel">
              {ls.map((l) => {
                const it = items.get(l.id)!;
                return (
                  <li key={l.slot} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_7rem]", !l.qty && "opacity-55")}>
                    <span className="min-w-0">
                      <b className="block">{itemLabel(it)}</b>
                      <small className="block text-ink-2">{l.why}</small>
                      {l.alts.length > 1 && (
                        <select aria-label={`Swap ${it.name}`} value={l.id} onChange={(e) => setP((p) => ({ ...p, swaps: { ...p.swaps, [l.slot]: e.target.value } }))} className="mt-1.5 h-9 max-w-full rounded-full border border-line bg-card px-2 text-fine">
                          {l.alts.map((id) => {
                            const x = items.get(id)!;
                            return <option key={id} value={id}>{itemLabel(x)}, {kes(x.price)}</option>;
                          })}
                        </select>
                      )}
                    </span>
                    <Step label={it.name} value={l.qty} min={0} max={999} onChange={(n) => setP((p) => ({ ...p, adj: { ...p.adj, [l.slot]: n } }))} />
                    <span className="col-span-2 text-right tabular-nums sm:col-span-1">{kes(it.price * l.qty)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <dl className="flex flex-col gap-1 rounded-2xl bg-ground-2 p-4">
        <div className="flex justify-between"><dt>Food</dt><dd className="tabular-nums">{kes(plan.food)}</dd></div>
        {adult && <div className="flex justify-between"><dt>Bar</dt><dd className="tabular-nums">{kes(plan.bar)}</dd></div>}
        <div className="flex justify-between"><dt>Soft drinks and water</dt><dd className="tabular-nums">{kes(plan.soft)}</dd></div>
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2"><dt className="font-bold">Total</dt><dd className="figures text-[1.75rem]">{kes(plan.total)}</dd></div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-bold">Chipping in</span>
        <Step label="people chipping in" value={P.chama} min={1} max={P.I.guests} onChange={(n) => setP((p) => ({ ...p, chama: n }))} />
        <b>{P.chama > 1 ? `${kes(Math.ceil(plan.total / P.chama / 10) * 10)} each` : "The host pays it all"}</b>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={whatsapp(phone, planText(P.I, plan, items))} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1fa855] px-5 font-bold text-white"><WhatsAppIcon className="size-5" /> Send the list to the lounge</a>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(planText(P.I, plan, items)); toast("The list is copied"); } catch { toast("Couldn't copy here. Use Send the list instead.", "danger"); } }} className="h-12 rounded-full border-[1.5px] border-action px-5 font-semibold text-action">Copy the list</button>
        <button type="button" onClick={() => setP({ I: fromOccasion(occasion(P.I.occ)), swaps: {}, adj: {}, step: 0, chama: 1, budget: null })} className="h-12 px-3 font-semibold text-ink-2 underline underline-offset-2">Start again</button>
      </div>
      <p className="text-fine text-ink-2">
        The quantities are the planner&rsquo;s estimate.{" "}
        {P.I.guests >= 30 ? "For a party this size the lounge confirms on WhatsApp before the kitchen starts, and a big choma order takes longer than 35 minutes. " : ""}
        Prices are the lounge&rsquo;s own; the order is checked before it&rsquo;s made.
      </p>
    </div>,
  ];

  return (
    <div ref={top} className="mx-auto flex w-full max-w-[1100px] scroll-mt-4 flex-col gap-5 px-4 py-6 md:px-8">
      <div className="relative overflow-hidden rounded-3xl text-white" style={{ background: o.hue }}>
        <Image src={occasionPhoto(o.id, adult).src} alt="" fill priority sizes="(min-width: 1100px) 1040px, 100vw" className="object-cover opacity-45" />
        <div className="relative flex flex-col gap-1 p-5 md:p-7">
          <p className="font-semibold opacity-90">Party packages</p>
          <h1 className="font-stencil text-h1 font-black uppercase md:text-[3.75rem]">Plan the party</h1>
          <p className="font-serif text-lead italic">{o.name}, {P.I.guests} guests, {hoursText(P.I.hours)}</p>
        </div>
      </div>

      <ol aria-label="Steps" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {STEPS.map((s, i) => (
          <li key={s} className="shrink-0">
            <button type="button" aria-current={i === P.step ? "step" : undefined} onClick={() => go(i)} className={cn("flex h-10 items-center gap-2 rounded-full px-3 font-semibold", i === P.step ? "bg-action text-on-action" : i < P.step ? "bg-action-soft text-action" : "bg-ground-2 text-ink-2")}>
              <span className="flex size-6 items-center justify-center rounded-full bg-black/10 text-fine">{i < P.step ? <Check aria-hidden className="size-3.5" /> : i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      {body[P.step]}

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border">
        <div className="flex flex-col">
          <span className="figures text-[1.5rem] leading-none">{kes(plan.total)}</span>
          <span className="text-fine text-ink-2">{P.I.guests} guests, about {kes(perHead(plan.total, P.I.guests))} a head</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {P.step > 0 && P.step < 3 && <button type="button" onClick={() => go(STEPS.length - 1)} className="h-11 px-2 font-semibold text-ink-2 underline underline-offset-2">Skip to the package</button>}
          {P.step > 0 && <button type="button" onClick={() => go(P.step - 1)} className="h-11 rounded-full border-[1.5px] border-line px-4 font-semibold">Back</button>}
          {last ? (
            <button type="button" disabled={!ordering || plan.total === 0} onClick={addAll} className="h-12 rounded-full bg-lime px-5 font-bold text-on-lime disabled:opacity-50">
              {ordering ? "Add it all to the order" : "Online ordering is closed"}
            </button>
          ) : (
            <button type="button" onClick={() => go(P.step + 1)} className="h-12 rounded-full bg-lime px-5 font-bold text-on-lime">Next: {STEPS[P.step + 1].toLowerCase()}</button>
          )}
        </div>
      </div>
    </div>
  );
}
