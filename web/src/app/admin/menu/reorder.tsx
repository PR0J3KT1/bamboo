"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { AdminDish } from "@/db/queries/admin-menu";
import { Pic } from "@/components/ui/picture";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { reorderDishes } from "./actions";

/* Put a section's dishes in order: drag a row by its handle, or use the arrows (keyboard and touch).
   Nothing changes on the menu until "Save the order". */
export function Reorder({ categoryId, name, dishes, onDone }: { categoryId: string; name: string; dishes: AdminDish[]; onDone: (saved: boolean) => void }) {
  const [order, setOrder] = useState(dishes);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [said, setSaid] = useState("");
  const toast = useToast();
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [d] = next.splice(from, 1);
    next.splice(to, 0, d);
    setOrder(next);
    setSaid(`${d.name} moved to place ${to + 1} of ${next.length}.`);
  };
  const changed = order.some((d, i) => d.key !== dishes[i].key);
  return (
    <section aria-labelledby="ro-h" className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ro-h" className="font-display text-[1.5rem] font-extrabold uppercase">The order of {name}</h2>
          <p className="text-fine text-ink-2">Drag a dish by its handle, or use the arrows. The menu shows them top to bottom.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="quiet" onClick={() => onDone(false)}>Cancel</Button>
          <Button
            variant="main"
            disabled={!changed || pending}
            onClick={() =>
              start(async () => {
                const r = await reorderDishes(categoryId, order.map((d) => d.key));
                toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
                onDone(r.ok);
              })
            }
          >
            {pending ? "Saving…" : "Save the order"}
          </Button>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">{said}</p>
      <ol className="flex flex-col">
        {order.map((d, i) => (
          <li
            key={d.key}
            draggable
            onDragStart={(e) => {
              setDragging(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", d.key);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null) move(dragging, i);
              setDragging(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            className={cn(
              "flex items-center gap-3 border-b border-line-2 py-2 last:border-0",
              dragging === i && "opacity-40",
              over === i && dragging !== null && dragging !== i && (dragging < i ? "border-b-2 border-b-action" : "border-t-2 border-t-action"),
            )}
          >
            <GripVertical aria-hidden className="size-5 shrink-0 cursor-grab text-ink-3" />
            <span className="figures w-7 shrink-0 text-right text-ink-3">{i + 1}</span>
            <span className={cn("relative h-10 w-[52px] shrink-0 overflow-hidden rounded-lg bg-ground-2", d.picture?.kind === "bottle" && "bottle-stage")}>
              {d.picture && <Pic picture={d.picture} alt="" sizes="52px" />}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{d.name}</span>
            <span className="flex shrink-0 gap-1">
              <button type="button" aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="flex size-10 items-center justify-center rounded-full hover:bg-ground-2 disabled:opacity-30"><ArrowUp aria-hidden className="size-4" /></button>
              <button type="button" aria-label={`Move ${d.name} down`} disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="flex size-10 items-center justify-center rounded-full hover:bg-ground-2 disabled:opacity-30"><ArrowDown aria-hidden className="size-4" /></button>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
