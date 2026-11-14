"use client";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { CatalogItem } from "@/db/queries/menu";
import { AddButton, OpenItemButton } from "@/components/order/add-button";
import { useCatalog } from "@/components/order/catalog";
import { cn } from "@/lib/utils";

/* The Cask Room, for adults: the bar's shelves on the dark board. With no shelf picked and no
   search, each shelf is a rail you scroll along; "See all" opens the whole shelf with filters for
   strength, price and style, and a sort. The search looks across every shelf. */

const RAIL = 12;
const PAGE = 36;

const STRENGTHS = [
  { id: "light", name: "Light", note: "under 15%", test: (a: number) => a < 15 },
  { id: "medium", name: "Medium", note: "15 to 35%", test: (a: number) => a >= 15 && a < 35 },
  { id: "strong", name: "Strong", note: "35% and over", test: (a: number) => a >= 35 },
] as const;
const BANDS = [
  { id: "1", name: "Under 1,000", test: (p: number) => p < 1000 },
  { id: "2", name: "1,000 to 3,000", test: (p: number) => p >= 1000 && p < 3000 },
  { id: "3", name: "3,000 to 8,000", test: (p: number) => p >= 3000 && p < 8000 },
  { id: "4", name: "8,000 and over", test: (p: number) => p >= 8000 },
] as const;
const SORTS = [
  { id: "menu", name: "As on the shelf" },
  { id: "plo", name: "Price, lowest first" },
  { id: "phi", name: "Price, highest first" },
  { id: "shi", name: "Strongest first" },
] as const;

const kes = (n: number) => n.toLocaleString("en-KE");
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function ranges(list: CatalogItem[]) {
  const abv = list.map((i) => i.abv).filter((a): a is number => a !== null);
  const price = list.map((i) => i.price);
  const r = (a: number[], f: (n: number) => string) => (!a.length ? "" : Math.min(...a) === Math.max(...a) ? f(Math.min(...a)) : `${f(Math.min(...a))} to ${f(Math.max(...a))}`);
  return { abv: r(abv, (n) => `${n}%`), price: `KES ${r(price, kes)}` };
}

function Bottle({ it }: { it: CatalogItem }) {
  const sub = [it.kind, it.size && !it.name.includes(it.size) ? it.size : null].filter(Boolean).join(", ");
  return (
    <li className="relative flex flex-col gap-1 rounded-2xl bg-on-grove/[0.06] p-3 ring-1 ring-on-grove/10 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-lime">
      {sub && <span className="text-fine text-on-grove-2">{sub}</span>}
      <h4 className="font-display text-[1.1875rem] leading-[1.05] font-extrabold text-on-grove uppercase">
        <OpenItemButton id={it.id}>{it.name}</OpenItemButton>
      </h4>
      <span className="text-fine text-on-grove-2">{[it.abv !== null ? `${it.abv}%` : null, it.origin].filter(Boolean).join(", ")}</span>
      <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
        <span className="flex items-baseline gap-1 text-on-grove">
          <small className="text-[0.6875rem] font-bold opacity-75">KES</small>
          <span className="figures text-[1.25rem] leading-none">{kes(it.price)}</span>
        </span>
        <AddButton id={it.id} name={it.name} tone="board" />
      </div>
    </li>
  );
}

function Chip({ on, onClick, children, n }: { on: boolean; onClick: () => void; children: React.ReactNode; n?: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!on && n === 0}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-semibold whitespace-nowrap disabled:opacity-40",
        on ? "bg-lime text-on-lime" : "bg-on-grove/10 text-on-grove hover:bg-on-grove/15",
      )}
    >
      {children}
      {n !== undefined && <small className={cn("text-fine font-semibold", on ? "text-on-lime/75" : "text-on-grove-2")}>{n}</small>}
    </button>
  );
}

function Rail({ name, all, onSeeAll }: { name: string; all: CatalogItem[]; onSeeAll: () => void }) {
  const track = useRef<HTMLUListElement>(null);
  const r = ranges(all);
  const by = (dir: number) => {
    const t = track.current;
    if (t) t.scrollBy({ left: dir * Math.max(200, t.clientWidth * 0.85), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <section aria-label={name} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-stencil text-[1.875rem] leading-[0.9] font-black text-on-grove uppercase md:text-[2.25rem]">{name}</h3>
          <p className="mt-1.5 text-fine text-on-grove-2 tabular-nums">
            {all.length} {all.length === 1 ? "bottle" : "bottles"}{r.abv && `, ${r.abv}`}, {r.price}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label={`Scroll ${name} back`} onClick={() => by(-1)} className="hidden size-10 items-center justify-center rounded-full bg-on-grove/10 text-on-grove [@media(hover:hover)]:md:flex">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button type="button" aria-label={`Scroll ${name} on`} onClick={() => by(1)} className="hidden size-10 items-center justify-center rounded-full bg-on-grove/10 text-on-grove [@media(hover:hover)]:md:flex">
            <ChevronRight aria-hidden className="size-5" />
          </button>
          {all.length > RAIL && (
            <button type="button" onClick={onSeeAll} className="h-10 rounded-full px-3 font-semibold text-lime underline-offset-2 hover:underline">
              See all {all.length}
            </button>
          )}
        </div>
      </div>
      <ul ref={track} className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-color:rgb(238_231_210/0.2)_transparent] [&>li]:w-[164px] [&>li]:shrink-0 [&>li]:snap-start">
        {all.slice(0, RAIL).map((it) => <Bottle key={it.id} it={it} />)}
        {all.length > RAIL && (
          <li className="flex">
            <button type="button" onClick={onSeeAll} className="flex w-full flex-col items-start justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-on-grove/25 p-4 text-left text-on-grove hover:border-lime">
              <span className="figures text-[2rem] leading-none">{all.length}</span>
              <span className="font-semibold">See the whole shelf</span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

export function CaskRoom({ id, title }: { id: string; title: string }) {
  const { catalog } = useCatalog();
  const bar = useMemo(() => catalog.items.filter((i) => i.alcohol && i.shelfId), [catalog]);
  const shelves = useMemo(() => catalog.shelves.filter((s) => bar.some((i) => i.shelfId === s.id)), [catalog, bar]);
  const hay = useMemo(() => new Map(bar.map((i) => [i.id, fold([i.name, i.brand, i.kind, i.origin, i.size].filter(Boolean).join(" "))])), [bar]);

  const [shelf, setShelf] = useState("all");
  const [str, setStr] = useState("all");
  const [band, setBand] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("menu");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const head = useRef<HTMLDivElement>(null);

  const query = fold(q.trim());
  const searching = query.length > 0;
  const curShelf = searching ? "all" : shelf;
  const curType = searching ? "all" : type;
  const rails = curShelf === "all" && str === "all" && band === "all" && !searching;

  const inStr = (i: CatalogItem, s: string) => s === "all" || (i.abv !== null && STRENGTHS.find((x) => x.id === s)!.test(i.abv));
  const inBand = (i: CatalogItem, b: string) => b === "all" || BANDS.find((x) => x.id === b)!.test(i.price);
  const inType = (i: CatalogItem, t: string) => t === "all" || i.kind === t;
  const base = bar.filter((i) => (curShelf === "all" || i.shelfId === curShelf) && (!searching || query.split(/\s+/).every((w) => hay.get(i.id)!.includes(w))));
  const list = base.filter((i) => inStr(i, str) && inBand(i, band) && inType(i, curType));
  const sorted =
    sort === "menu"
      ? list
      : [...list].sort((a, b) => (sort === "plo" ? a.price - b.price : sort === "phi" ? b.price - a.price : (b.abv ?? 0) - (a.abv ?? 0)));
  const kinds = curShelf === "all" ? [] : [...new Set(base.filter((i) => inStr(i, str) && inBand(i, band)).map((i) => i.kind).filter((k): k is string => !!k))];

  function pickShelf(s: string) {
    setShelf(s);
    setType("all");
    setShown(PAGE);
    setQ("");
    head.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const shelfName = (s: string) => shelves.find((x) => x.id === s)?.name ?? "Every shelf";

  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="grove-bg scroll-mt-16 rounded-3xl p-4 text-on-grove outline-none md:p-6 lg:scroll-mt-6">
      <div ref={head} className="flex scroll-mt-16 flex-col gap-4 lg:scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id={`${id}-h`} className="font-stencil text-h1 font-black uppercase">{title}</h2>
            <p className="mt-1 font-serif text-lead text-lime italic">{bar.length} drinks behind the bar.</p>
          </div>
          <label className="flex h-12 w-full items-center gap-2 rounded-full bg-on-grove/10 px-4 focus-within:ring-2 focus-within:ring-lime sm:w-72">
            <Search aria-hidden className="size-4 text-on-grove-2" />
            <span className="sr-only">Search the Cask Room</span>
            <input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
              placeholder="Search: Jameson, gin, Kenya…"
              className="min-w-0 flex-1 bg-transparent text-on-grove outline-none placeholder:text-on-grove-2"
            />
          </label>
        </div>

        {!searching && (
          <div role="group" aria-label="Shelves" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <Chip on={shelf === "all"} onClick={() => pickShelf("all")}>All shelves</Chip>
            {shelves.map((s) => (
              <Chip key={s.id} on={shelf === s.id} onClick={() => pickShelf(s.id)} n={bar.filter((i) => i.shelfId === s.id).length}>{s.name}</Chip>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div role="group" aria-label="Strength" className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
            <span className="w-16 shrink-0 text-fine font-semibold text-on-grove-2">Strength</span>
            <Chip on={str === "all"} onClick={() => setStr("all")}>Any</Chip>
            {STRENGTHS.map((s) => (
              <Chip key={s.id} on={str === s.id} onClick={() => { setStr(s.id); setShown(PAGE); }} n={base.filter((i) => inStr(i, s.id) && inBand(i, band) && inType(i, curType)).length}>
                {s.name} <span className="font-normal">{s.note}</span>
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Price" className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
            <span className="w-16 shrink-0 text-fine font-semibold text-on-grove-2">Price</span>
            <Chip on={band === "all"} onClick={() => setBand("all")}>Any</Chip>
            {BANDS.map((b) => (
              <Chip key={b.id} on={band === b.id} onClick={() => { setBand(b.id); setShown(PAGE); }} n={base.filter((i) => inBand(i, b.id) && inStr(i, str) && inType(i, curType)).length}>
                {b.name}
              </Chip>
            ))}
          </div>
          {kinds.length > 1 && (
            <div role="group" aria-label="Style" className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
              <span className="w-16 shrink-0 text-fine font-semibold text-on-grove-2">Style</span>
              <Chip on={type === "all"} onClick={() => setType("all")}>All</Chip>
              {kinds.map((k) => (
                <Chip key={k} on={type === k} onClick={() => { setType(k); setShown(PAGE); }} n={base.filter((i) => i.kind === k && inStr(i, str) && inBand(i, band)).length}>{k}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {rails ? (
        <div className="mt-8 flex flex-col gap-9">
          {shelves.map((s) => (
            <Rail key={s.id} name={s.name} all={bar.filter((i) => i.shelfId === s.id)} onSeeAll={() => pickShelf(s.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-stencil text-[1.875rem] leading-[0.9] font-black uppercase md:text-[2.25rem]" aria-live="polite">
              {searching ? `Matching “${q.trim()}”` : shelfName(curShelf)}
              <small className="ml-2 font-sans text-fine font-semibold tracking-normal text-on-grove-2 normal-case">
                {sorted.length} {sorted.length === 1 ? "drink" : "drinks"}
              </small>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 items-center gap-2 rounded-full bg-on-grove/10 pr-1 pl-3.5 text-fine font-semibold">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-8 rounded-full bg-grove px-2 text-body text-on-grove">
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              {(shelf !== "all" || str !== "all" || band !== "all" || searching) && (
                <button type="button" onClick={() => { setStr("all"); setBand("all"); setType("all"); pickShelf("all"); }} className="h-10 rounded-full px-3 font-semibold text-lime underline-offset-2 hover:underline">
                  Back to every shelf
                </button>
              )}
            </div>
          </div>
          {sorted.length === 0 ? (
            <p className="text-on-grove-2">{searching ? "Nothing on the shelves matches. Try a brand, a kind of drink or a country." : "Nothing on this shelf matches. Try another strength or price."}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
              {sorted.slice(0, shown).map((it) => <Bottle key={it.id} it={it} />)}
            </ul>
          )}
          {sorted.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-12 self-center rounded-full bg-on-grove/10 px-6 font-semibold hover:bg-on-grove/15">
              Show {Math.min(PAGE, sorted.length - shown)} more, {sorted.length - shown} left
            </button>
          )}
        </div>
      )}
    </section>
  );
}
