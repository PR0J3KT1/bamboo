"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { AdminDish, AdminMenuData } from "@/db/queries/admin-menu";
import { ChoicePill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Switch } from "@/components/admin/switch";
import { cn } from "@/lib/utils";
import { Pic } from "@/components/ui/picture";
import { Reorder } from "./reorder";
import { savePrices, saveSection, setAvailability } from "./actions";
import { DishEditor } from "./dish-editor";

function fold(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function MenuAdmin({ data, canEdit }: { data: AdminMenuData; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState(data.categories.find((c) => c.id === "grill")?.id ?? data.categories[0]?.id);
  const [shelf, setShelf] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlySoldOut, setOnlySoldOut] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({}); // item id → typed price
  const [editing, setEditing] = useState<AdminDish | "new" | null>(null);
  const [saving, startSave] = useTransition();
  const [ordering, setOrdering] = useState(false);

  const shelvesHere = useMemo(() => {
    const ids = new Set(data.dishes.filter((d) => d.categoryId === category && d.shelfId).map((d) => d.shelfId));
    return data.shelves.filter((s) => ids.has(s.id));
  }, [data, category]);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return data.dishes.filter((d) => {
      if (q) return fold(`${d.name} ${d.brand ?? ""} ${d.kind ?? ""}`).includes(q);
      if (d.categoryId !== category) return false;
      if (shelf && d.shelfId !== shelf) return false;
      if (onlySoldOut && d.sizes.some((s) => s.active)) return false;
      return true;
    });
  }, [data, query, category, shelf, onlySoldOut]);

  const soldOutCount = data.dishes.filter((d) => d.sizes.every((s) => !s.active)).length;
  const original = useMemo(() => new Map(data.dishes.flatMap((d) => d.sizes.map((s) => [s.id, s.price] as const))), [data]);
  const changed = Object.entries(prices).filter(([id, v]) => Number(v.replace(/[,\s]/g, "")) !== original.get(id));
  const invalid = changed.some(([, v]) => !/^\d{1,7}$/.test(v.replace(/[,\s]/g, "")) || Number(v.replace(/[,\s]/g, "")) < 1);

  function save() {
    startSave(async () => {
      const r = await savePrices(changed.map(([id, v]) => ({ id, price: Number(v.replace(/[,\s]/g, "")) })));
      if (!r.ok) return toast(r.error, "danger");
      setPrices({});
      toast(r.message);
      router.refresh();
    });
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1400px] flex-col gap-3.5 px-4 py-5 pb-28 md:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-h2 font-extrabold uppercase">Menu and prices</h1>
        {canEdit && <Link href="/admin/menu/plates" className="text-fine font-semibold text-action underline underline-offset-2">Who&rsquo;s eating? plates</Link>}
        <span className="text-ink-2">{soldOutCount} sold out</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-12 min-w-0 flex-[1_1_260px] items-center gap-2 rounded-full border-[1.5px] border-line bg-panel px-4 md:max-w-sm">
          <Search aria-hidden className="size-4 text-ink-2" />
          <span className="sr-only">Search the menu</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${data.dishes.length} dishes and drinks`} className="flex-1 bg-transparent outline-none" />
        </label>
        <ChoicePill selected={onlySoldOut} onClick={() => setOnlySoldOut(!onlySoldOut)}>Sold out only</ChoicePill>
        {canEdit && <Button className="ml-auto" onClick={() => setEditing("new")}>Add a dish or drink</Button>}
      </div>

      {!query && (
        <nav aria-label="Menu sections" className="flex flex-wrap gap-1.5">
          {data.categories.map((c) => (
            <ChoicePill key={c.id} selected={c.id === category} onClick={() => { setCategory(c.id); setShelf(null); }}>{c.name}</ChoicePill>
          ))}
        </nav>
      )}
      {!query && canEdit && (() => {
        const c = data.categories.find((x) => x.id === category);
        return c ? <SectionNote key={c.id} id={c.id} name={c.name} note={c.note} /> : null;
      })()}
      {!query && shelvesHere.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <ChoicePill selected={!shelf} onClick={() => setShelf(null)} className="h-9">All shelves</ChoicePill>
          {shelvesHere.map((s) => (
            <ChoicePill key={s.id} selected={s.id === shelf} onClick={() => setShelf(s.id)} className="h-9">{s.name}</ChoicePill>
          ))}
        </div>
      )}

      {canEdit && !query && !ordering && (
        <button type="button" disabled={!!shelf || onlySoldOut} onClick={() => setOrdering(true)} className="self-start text-fine font-semibold text-action underline underline-offset-2 disabled:text-ink-3 disabled:no-underline">
          {shelf || onlySoldOut ? "Show the whole section to change its order" : "Change the order"}
        </button>
      )}
      {ordering && category && (
        <Reorder
          key={category}
          categoryId={category}
          name={data.categories.find((c) => c.id === category)?.name ?? "this section"}
          dishes={data.dishes.filter((d) => d.categoryId === category).sort((a, b) => a.sort - b.sort)}
          onDone={(saved) => {
            setOrdering(false);
            if (saved) router.refresh();
          }}
        />
      )}
      {!ordering && (
      <div className="md:overflow-x-auto md:rounded-2xl md:border md:border-line md:bg-panel">
        {/* below md each row lays out as a card: dish and Edit on top, prices, then the switch */}
        <table className="w-full border-collapse text-left max-md:block md:min-w-[820px]">
          <thead className="max-md:hidden">
            <tr className="text-fine font-semibold text-ink-2">
              <th scope="col" className="border-b border-line px-4 py-3">Dish</th>
              <th scope="col" className="border-b border-line px-4 py-3">Prices, KES</th>
              <th scope="col" className="border-b border-line px-4 py-3">On the menu</th>
              {canEdit && <th scope="col" className="border-b border-line px-4 py-3"><span className="sr-only">Edit</span></th>}
            </tr>
          </thead>
          <tbody className="max-md:flex max-md:flex-col max-md:gap-2.5">
            {rows.map((d) => (
              <Row key={d.key} d={d} canEdit={canEdit} prices={prices} setPrice={(id, v) => setPrices((p) => ({ ...p, [id]: v }))} onEdit={() => setEditing(d)} />
            ))}
            {rows.length === 0 && (
              <tr className="max-md:block max-md:rounded-2xl max-md:border max-md:border-line max-md:bg-panel"><td colSpan={4} className="px-4 py-6 text-ink-2 max-md:block">{query ? `Nothing matches "${query}".` : "Nothing here."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {changed.length > 0 && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-3xl bg-grove p-2 pl-5 text-on-grove shadow-lift sm:rounded-full">
          <span className="font-semibold">
            {invalid ? "A price isn't a whole number" : changed.length === 1 ? "1 price change not saved yet" : `${changed.length} price changes not saved yet`}
          </span>
          <span className="flex gap-1.5">
            <button type="button" className="h-11 rounded-full px-4 font-semibold" onClick={() => setPrices({})}>Undo</button>
            <button type="button" disabled={invalid || saving} onClick={save} className="h-11 rounded-full bg-lime px-5 font-bold text-on-lime disabled:opacity-60">
              {saving ? "Saving…" : "Save prices"}
            </button>
          </span>
        </div>
      )}

      {canEdit && editing && (
        <DishEditor
          dish={editing === "new" ? null : editing}
          data={data}
          defaultCategory={category}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </main>
  );
}

function Row({ d, canEdit, prices, setPrice, onEdit }: {
  d: AdminDish;
  canEdit: boolean;
  prices: Record<string, string>;
  setPrice: (id: string, v: string) => void;
  onEdit: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const on = d.sizes.some((s) => s.active);
  const multi = d.sizes.length > 1;
  return (
    <tr className={cn(
      "border-b border-line-2 last:border-0",
      "max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-3 max-md:rounded-2xl max-md:border max-md:border-line max-md:bg-panel max-md:p-3.5",
      !on && "bg-panel-2 max-md:bg-panel-2",
    )}>
      <td className="px-4 py-2.5 max-md:order-1 max-md:min-w-0 max-md:p-0">
        <div className="flex items-center gap-3">
          {d.picture ? (
            <span className={cn("relative h-10 w-[52px] shrink-0 overflow-hidden rounded-lg", d.picture.kind === "bottle" && "bottle-stage")}>
              <Pic picture={d.picture} alt="" sizes="52px" />
            </span>
          ) : (
            <span aria-hidden className="flex h-10 w-[52px] items-center justify-center rounded-lg bg-ground-2 text-fine font-bold text-ink-3">{d.name.slice(0, 2).toUpperCase()}</span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="font-bold">{d.name}</span>
            <span className="text-fine text-ink-2">{[d.tag, d.kind, d.alcohol ? "18+" : null].filter(Boolean).join(", ")}</span>
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 max-md:order-3 max-md:col-span-2 max-md:p-0">
        <div className="flex flex-wrap gap-2">
          {d.sizes.map((s) => {
            const typed = prices[s.id];
            const dirty = typed !== undefined && Number(typed.replace(/[,\s]/g, "")) !== s.price;
            return (
              <label key={s.id} className={cn("flex flex-col gap-0.5 text-fine text-ink-2", !s.active && multi && "opacity-60")}>
                {multi || s.portion ? (s.portion ?? "") : <span className="sr-only">Price</span>}
                {canEdit ? (
                  <input
                    inputMode="numeric"
                    aria-label={`Price for ${d.name}${s.portion ? `, ${s.portion}` : ""}`}
                    value={typed ?? s.price.toLocaleString("en-KE")}
                    onChange={(e) => setPrice(s.id, e.target.value)}
                    className={cn(
                      "figures h-10 w-[92px] rounded-[10px] px-2.5 text-[1.25rem] text-ink",
                      dirty ? "border-2 border-warn bg-warn-soft" : "border-[1.5px] border-line bg-card",
                    )}
                  />
                ) : (
                  <span className="figures text-[1.25rem] text-ink">{s.price.toLocaleString("en-KE")}</span>
                )}
              </label>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-2.5 max-md:order-4 max-md:col-span-2 max-md:border-t max-md:border-line-2 max-md:p-0 max-md:pt-2.5">
        <label className="flex items-center gap-2.5 font-semibold">
          <Switch
            checked={on}
            disabled={pending}
            aria-label={`${d.name}: ${on ? "on the menu" : "sold out"}`}
            onCheckedChange={(v) =>
              start(async () => {
                const r = await setAvailability(d.key, !!v);
                toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
                router.refresh();
              })
            }
          />
          {on ? "On the menu" : "Sold out"}
        </label>
      </td>
      {canEdit && (
        <td className="px-4 py-2.5 text-right max-md:order-2 max-md:self-start max-md:p-0">
          <button type="button" onClick={onEdit} className="h-10 rounded-full border-[1.5px] border-line px-4 text-[0.875rem] font-semibold hover:border-action">
            Edit<span className="sr-only"> {d.name}</span>
          </button>
        </td>
      )}
    </tr>
  );
}

/* A section's name and the one-line note customers read under it. */
function SectionNote({ id, name, note }: { id: string; name: string; note: string | null }) {
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [t, setT] = useState(note ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!editing) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-[1rem] text-ink-2 italic">{note || "No note under this section."}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-fine font-semibold text-action underline">Edit the section</button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-wrap items-end gap-2.5 rounded-2xl border border-line bg-panel p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSection(id, n, t);
          toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
          if (r.ok) { setEditing(false); router.refresh(); }
        });
      }}
    >
      <label className="flex flex-col gap-1 text-[0.875rem] font-semibold">Section name
        <input value={n} maxLength={60} onChange={(e) => setN(e.target.value)} className="h-11 rounded-xl border-[1.5px] border-line bg-card px-3 font-normal" />
      </label>
      <label className="flex min-w-64 flex-1 flex-col gap-1 text-[0.875rem] font-semibold">Note under it
        <input value={t} maxLength={300} onChange={(e) => setT(e.target.value)} className="h-11 rounded-xl border-[1.5px] border-line bg-card px-3 font-normal" />
      </label>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save section"}</Button>
      <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
    </form>
  );
}
