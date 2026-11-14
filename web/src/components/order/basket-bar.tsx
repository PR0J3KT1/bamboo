"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { Price } from "@/components/ui/price";
import { Button, buttonStyles } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { basket, useBasket } from "@/lib/basket";
import { lineKey } from "@/lib/orders";
import { lineName, useCatalog } from "./catalog";

/** The basket priced from the menu the browser has; lines it can't price are "unavailable". */
export function useBasketTotals() {
  const b = useBasket();
  const { byId } = useCatalog();
  const lines = b.lines.map((l) => ({ ...l, item: byId.get(l.itemId) }));
  const ok = lines.filter((l) => l.item);
  return {
    basket: b,
    lines,
    unavailable: lines.filter((l) => !l.item),
    count: ok.reduce((s, l) => s + l.qty, 0),
    subtotal: ok.reduce((s, l) => s + l.qty * l.item!.price, 0),
  };
}

export function BasketBar() {
  const [open, setOpen] = useState(false);
  const { basket: b, lines, unavailable, count, subtotal } = useBasketTotals();
  const { catalog, byId } = useCatalog();
  /* one thing that goes with what's in the order and isn't in it yet */
  const inOrder = new Set(lines.map((l) => l.itemId));
  const suggestion = lines
    .flatMap((l) => catalog.pairs[l.item?.familyId ?? l.itemId] ?? catalog.pairs[l.itemId] ?? [])
    .map((id) => byId.get(id))
    .find((it) => it && !inOrder.has(it.id) && !it.options?.length);
  if (!lines.length && !open) return null;

  return (
    <>
      {lines.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex lg:hidden h-[60px] max-w-xl items-center justify-between rounded-full bg-lime pr-2 pl-[22px] text-on-lime shadow-lift"
        >
          <span className="flex flex-col text-left leading-tight">
            <span className="font-bold">View order</span>
            <span className="text-fine">{count === 1 ? "1 item" : `${count} items`}</span>
          </span>
          <span className="flex h-[46px] items-center rounded-full bg-on-lime px-[18px] text-lime">
            <Price amount={subtotal} size="md" />
          </span>
        </button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your order"
        footer={
          lines.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-2">Food and drinks</span>
                <Price amount={subtotal} size="lg" />
              </div>
              {b.mode === "delivery" && <span className="text-fine text-ink-2">Delivery is added at checkout, from KES 150.</span>}
              <Link href="/checkout" onClick={() => setOpen(false)} className={buttonStyles({ variant: "main", size: "lg", block: true })}>
                Go to checkout
              </Link>
            </div>
          ) : undefined
        }
      >
        {!lines.length ? (
          <p className="text-body text-ink-2">Your order is empty.</p>
        ) : (
          <>
            {unavailable.length > 0 && (
              <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-warn-soft p-3 text-body">
                <span>
                  {unavailable.length === 1 ? "One thing in your order is" : `${unavailable.length} things in your order are`} no longer on the menu for you.
                </span>
                <Button size="sm" variant="outline" className="self-start" onClick={() => basket.remove(unavailable.map((l) => l.itemId))}>
                  Take {unavailable.length === 1 ? "it" : "them"} out
                </Button>
              </div>
            )}
            <ul className="-mt-1 flex flex-col">
              {lines.filter((l) => l.item).map((l) => (
                <li key={lineKey(l.itemId, l.option)} className="flex items-center gap-3 border-b border-line-2 py-3.5">
                  {l.item!.image && <Image src={l.item!.image} alt="" width={112} height={112} className="size-14 shrink-0 rounded-[10px] object-cover" />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-[1.1875rem] leading-tight font-extrabold uppercase">{lineName(l.item, l.option)}</span>
                    <span className="text-fine text-ink-2">KES {l.item!.price.toLocaleString("en-KE")} each</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="figures text-[1.1875rem]">{(l.qty * l.item!.price).toLocaleString("en-KE")}</span>
                    <Stepper size="sm" value={l.qty} label={l.item!.name} onChange={(n) => basket.setQty(l.itemId, l.option, n)} />
                  </div>
                </li>
              ))}
            </ul>
            {suggestion && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-ground p-3.5">
                <span className="flex flex-col">
                  <span className="text-fine font-bold">You might want</span>
                  <span>{suggestion.name} <span className="text-ink-2">KES {suggestion.price.toLocaleString("en-KE")}</span></span>
                </span>
                <Button size="sm" variant="outline" onClick={() => basket.add(suggestion.id, null, 1)}>Add</Button>
              </div>
            )}
            <TextAreaField label="A note for the kitchen" rows={2} maxLength={300} value={b.note} onChange={(e) => basket.set({ note: e.target.value })} placeholder="Choma well done, please." />
          </>
        )}
      </Sheet>
    </>
  );
}
