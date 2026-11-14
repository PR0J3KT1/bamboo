"use client";
import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deletePlate, movePlate, savePlate } from "./actions";
import { cn } from "@/lib/utils";

type Who = "one" | "two" | "table";
type PlateData = { id: string | null; name: string; who: Who; photoKey: string | null; parts: { itemId: string; qty: number }[] };
type Item = { id: string; name: string; price: number; active: boolean; alcohol: boolean };
type Photo = { key: string; src: string; alt: string };

const WHO: { id: Who; name: string }[] = [{ id: "one", name: "Just me" }, { id: "two", name: "Two of us" }, { id: "table", name: "The table" }];
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export function PlatesEditor({ plates, items, photos }: { plates: PlateData[]; items: Item[]; photos: Photo[] }) {
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [editing, setEditing] = useState<PlateData | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const run = (p: Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await p;
      toast(r.ok ? r.message! : r.error!, r.ok ? "ok" : "danger");
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <Button variant="main" className="self-start" onClick={() => setEditing({ id: null, name: "", who: "two", photoKey: null, parts: [] })}>
        <Plus aria-hidden className="size-4" /> New plate
      </Button>
      <ul className="flex flex-col gap-2.5">
        {plates.map((p, i) => {
          const parts = p.parts.map((x) => ({ ...x, item: byId.get(x.itemId) }));
          const total = parts.reduce((s, x) => s + (x.item?.price ?? 0) * x.qty, 0);
          const hidden = parts.some((x) => !x.item?.active);
          const photo = photos.find((ph) => ph.key === p.photoKey);
          return (
            <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-panel p-3">
              <span className="relative size-16 overflow-hidden rounded-xl bg-ground-2">{photo && <Image src={photo.src} alt="" fill sizes="64px" className="object-cover" />}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2">
                  <b className="font-display text-[1.25rem] uppercase">{p.name}</b>
                  <span className="text-fine text-ink-2">{WHO.find((w) => w.id === p.who)?.name}</span>
                  {hidden && <span className="rounded-full bg-warn-soft px-2 text-fine font-semibold text-warn-ink">Hidden: a dish is sold out</span>}
                </span>
                <span className="block truncate text-fine text-ink-2">{parts.map((x) => `${x.qty > 1 ? `${x.qty} × ` : ""}${x.item?.name ?? "removed dish"}`).join(", ")}</span>
                <span className="figures text-[1.0625rem]">{kes(total)}</span>
              </span>
              <span className="flex items-center gap-1">
                <button type="button" aria-label={`Move ${p.name} up`} disabled={pending || i === 0} onClick={() => run(movePlate(p.id!, -1))} className="flex size-10 items-center justify-center rounded-full hover:bg-ground-2 disabled:opacity-30"><ArrowUp aria-hidden className="size-4" /></button>
                <button type="button" aria-label={`Move ${p.name} down`} disabled={pending || i === plates.length - 1} onClick={() => run(movePlate(p.id!, 1))} className="flex size-10 items-center justify-center rounded-full hover:bg-ground-2 disabled:opacity-30"><ArrowDown aria-hidden className="size-4" /></button>
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
              </span>
            </li>
          );
        })}
        {plates.length === 0 && <li className="rounded-2xl border border-line bg-panel p-5 text-ink-2">No plates yet. Make one for one, two or the table.</li>}
      </ul>
      {editing && <PlateForm key={editing.id ?? "new"} plate={editing} items={items} byId={byId} photos={photos} onClose={() => setEditing(null)} onDelete={editing.id ? () => { run(deletePlate(editing.id!)); setEditing(null); } : undefined} />}
    </div>
  );
}

function PlateForm({ plate, items, byId, photos, onClose, onDelete }: { plate: PlateData; items: Item[]; byId: Map<string, Item>; photos: Photo[]; onClose: () => void; onDelete?: () => void }) {
  const [p, setP] = useState(plate);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const found = q.trim().length >= 2 ? items.filter((i) => i.active && i.name.toLowerCase().includes(q.trim().toLowerCase()) && !p.parts.some((x) => x.itemId === i.id)).slice(0, 8) : [];
  const total = p.parts.reduce((s, x) => s + (byId.get(x.itemId)?.price ?? 0) * x.qty, 0);
  const setQty = (id: string, qty: number) => setP((x) => ({ ...x, parts: qty < 1 ? x.parts.filter((y) => y.itemId !== id) : x.parts.map((y) => (y.itemId === id ? { ...y, qty } : y)) }));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="plate-h" className="fixed inset-0 z-50 flex items-end justify-center bg-scrim p-0 md:items-center md:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await savePlate(p);
            if (!r.ok) return setError(r.error);
            toast(r.message);
            onClose();
            router.refresh();
          });
        }}
        className="flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-3xl bg-panel md:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="plate-h" className="font-display text-[1.5rem] font-extrabold uppercase">{plate.id ? "Edit the plate" : "New plate"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-ground-2"><X aria-hidden className="size-5" /></button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Name</span>
            <input autoFocus required maxLength={60} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Kienyeji for two" className="h-11 rounded-xl border-[1.5px] border-line bg-card px-3" />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Who it&rsquo;s for</span>
            <div role="group" aria-label="Who it's for" className="flex flex-wrap gap-2">
              {WHO.map((w) => (
                <button key={w.id} type="button" aria-pressed={p.who === w.id} onClick={() => setP({ ...p, who: w.id })} className={cn("h-10 rounded-full border-[1.5px] px-4 font-semibold", p.who === w.id ? "border-action bg-action text-on-action" : "border-line bg-card")}>{w.name}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Photo <span className="font-normal text-ink-2">the lounge&rsquo;s own</span></span>
            <div role="group" aria-label="Photo" className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" aria-pressed={!p.photoKey} onClick={() => setP({ ...p, photoKey: null })} className={cn("flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border-[1.5px] text-fine", !p.photoKey ? "border-action ring-2 ring-action" : "border-line")}>None</button>
              {photos.map((ph) => (
                <button key={ph.key} type="button" aria-pressed={p.photoKey === ph.key} aria-label={ph.alt || ph.key} onClick={() => setP({ ...p, photoKey: ph.key })} className={cn("relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-[1.5px]", p.photoKey === ph.key ? "border-action ring-2 ring-action" : "border-line")}>
                  <Image src={ph.src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Dishes</span>
            <ul className="flex flex-col divide-y divide-line-2 rounded-2xl border border-line bg-card">
              {p.parts.map((x) => {
                const it = byId.get(x.itemId);
                return (
                  <li key={x.itemId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{it?.name ?? "A dish no longer on the menu"}</span>
                      <span className="text-fine text-ink-2">{it ? kes(it.price) : ""}{it && !it.active ? ", sold out" : ""}{it?.alcohol ? ", alcohol" : ""}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label={`One fewer ${it?.name ?? ""}`} onClick={() => setQty(x.itemId, x.qty - 1)} className="flex size-9 items-center justify-center rounded-full bg-ground-2">{x.qty === 1 ? <Trash2 aria-hidden className="size-4" /> : <Minus aria-hidden className="size-4" />}</button>
                      <span className="figures w-7 text-center">{x.qty}</span>
                      <button type="button" aria-label={`One more ${it?.name ?? ""}`} disabled={x.qty >= 20} onClick={() => setQty(x.itemId, x.qty + 1)} className="flex size-9 items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40"><Plus aria-hidden className="size-4" /></button>
                    </span>
                  </li>
                );
              })}
              {p.parts.length === 0 && <li className="px-3 py-3 text-ink-2">No dishes yet. Find them below.</li>}
            </ul>
            <label className="flex flex-col gap-1.5">
              <span className="sr-only">Find a dish to add</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a dish to add: ugali, choma…" className="h-11 rounded-full border-[1.5px] border-line bg-card px-4" />
            </label>
            {found.length > 0 && (
              <ul className="flex flex-col rounded-2xl border border-line bg-card">
                {found.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => { setP({ ...p, parts: [...p.parts, { itemId: i.id, qty: 1 }] }); setQ(""); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ground-2">
                      <span>{i.name}{i.alcohol ? <span className="text-fine text-ink-2">, alcohol</span> : null}</span>
                      <span className="text-fine text-ink-2">{kes(i.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="figures text-[1.25rem]">{kes(total)}</span>
          <span className="flex flex-wrap gap-2">
            {onDelete && (sure ? <Button variant="danger" onClick={onDelete}>Yes, take it off</Button> : <Button variant="quiet" className="text-danger-ink" onClick={() => setSure(true)}>Delete</Button>)}
            <Button type="submit" variant="main" disabled={pending}>{pending ? "Saving…" : "Save the plate"}</Button>
          </span>
        </div>
      </form>
    </div>
  );
}
