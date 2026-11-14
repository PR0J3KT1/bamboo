"use client";
import Link from "next/link";
import { Price } from "@/components/ui/price";
import { Stepper } from "@/components/ui/stepper";
import { buttonStyles } from "@/components/ui/button";
import { basket } from "@/lib/basket";
import { lineKey } from "@/lib/orders";
import { lineName } from "./catalog";
import { useBasketTotals } from "./basket-bar";

/* Desktop: the order beside the menu, so it's always in view. Phones use the basket bar. */
export function OrderPanel() {
  const { basket: b, lines, unavailable, subtotal } = useBasketTotals();
  const ok = lines.filter((l) => l.item);
  return (
    <aside aria-label="Your order" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] flex-col gap-3 self-start rounded-[20px] border border-line bg-panel p-[18px] lg:flex">
      <h2 className="font-display text-[1.625rem] leading-none font-extrabold uppercase">Your order</h2>
      {!ok.length ? (
        <p className="text-ink-2">Nothing yet. Tap + on a dish to start your order.</p>
      ) : (
        <>
          <ul className="-mx-1 flex min-h-0 flex-col overflow-y-auto px-1">
            {ok.map((l) => (
              <li key={lineKey(l.itemId, l.option)} className="flex flex-col gap-1.5 border-b border-line-2 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{lineName(l.item, l.option)}</span>
                  <span className="figures text-[1.0625rem]">{(l.qty * l.item!.price).toLocaleString("en-KE")}</span>
                </div>
                <div className="self-start">
                  <Stepper size="sm" value={l.qty} label={l.item!.name} onChange={(n) => basket.setQty(l.itemId, l.option, n)} />
                </div>
              </li>
            ))}
          </ul>
          {unavailable.length > 0 && (
            <p role="alert" className="rounded-xl bg-warn-soft p-2.5 text-fine text-warn-ink">
              {unavailable.length === 1 ? "One thing" : `${unavailable.length} things`} in your order {unavailable.length === 1 ? "is" : "are"} no longer on the menu for you.{" "}
              <button type="button" className="font-semibold underline" onClick={() => basket.remove(unavailable.map((l) => l.itemId))}>Take {unavailable.length === 1 ? "it" : "them"} out</button>
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="font-bold">Food and drinks</span>
            <Price amount={subtotal} size="lg" />
          </div>
          {b.mode === "delivery" && <span className="-mt-2 text-fine text-ink-2">Delivery is added at checkout, from KES 150.</span>}
          <Link href="/checkout" className={buttonStyles({ variant: "main", size: "lg", block: true })}>Go to checkout</Link>
        </>
      )}
    </aside>
  );
}
