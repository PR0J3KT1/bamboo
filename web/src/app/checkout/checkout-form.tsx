"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { DeliveryPlace } from "@/db/queries/menu";
import { basket, rememberOrder } from "@/lib/basket";
import { fareFor } from "@/lib/orders";
import { deliveryFee, placeOrder } from "@/app/actions/orders";
import { useBasketTotals } from "@/components/order/basket-bar";
import { lineName } from "@/components/order/catalog";
import { Button, buttonStyles } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Price, formatKes } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { PlacePicker } from "./place-picker";

const card = "flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4";

export function CheckoutForm({ places, signedIn, defaultName, defaultPhone }: {
  places: DeliveryPlace[];
  signedIn: boolean;
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const { basket: b, lines, unavailable, subtotal } = useBasketTotals();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const place = places.find((p) => p.id === b.placeId) ?? null;

  /* TumaBoda's fee for this place and this much food, fetched as either changes; the fare rule
     stands in until it arrives (or if TumaBoda isn't set up). */
  const quoteKey = place && b.mode === "delivery" ? `${place.id}:${subtotal}` : null;
  const [quote, setQuote] = useState<{ key: string; fee: number } | null>(null);
  useEffect(() => {
    if (!quoteKey || !place) return;
    let live = true;
    deliveryFee(place.id, subtotal).then((r) => {
      if (live && r) setQuote({ key: quoteKey, fee: r.fee });
    });
    return () => {
      live = false;
    };
  }, [quoteKey, place, subtotal]);
  const fee = b.mode === "delivery" && place ? (quote?.key === quoteKey ? quote.fee : fareFor(place.km)) : 0;
  const ok = lines.filter((l) => l.item);
  const hasAlcohol = ok.some((l) => l.item!.alcohol);

  function submit() {
    setError(null);
    setPlaceError(null);
    if (b.mode === "delivery" && !place) {
      setPlaceError("Choose where to deliver to.");
      return;
    }
    start(async () => {
      const r = await placeOrder({
        lines: ok.map((l) => ({ itemId: l.itemId, option: l.option, qty: l.qty })),
        mode: b.mode,
        placeId: b.mode === "delivery" ? b.placeId : null,
        directions: b.directions || null,
        note: b.note || null,
        name,
        phone,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      rememberOrder(r.id, r.code);
      basket.clear();
      router.push(`/orders/${r.id}`);
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-3">
          <Link href="/" aria-label="Back to the menu" className="flex size-11 items-center justify-center rounded-full">
            <ChevronLeft aria-hidden className="size-6" />
          </Link>
          <h1 className="font-display text-[1.75rem] font-extrabold uppercase">Checkout</h1>
        </div>
      </header>

      {!lines.length ? (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
          <p className="text-lead">Your order is empty.</p>
          <Link href="/" className={buttonStyles({ variant: "main", size: "lg" })}>See the menu</Link>
        </main>
      ) : (
        <form
          className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {unavailable.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-warn-soft p-3">
              <span>{unavailable.length === 1 ? "One thing in your order is" : `${unavailable.length} things are`} no longer on the menu for you.</span>
              <Button size="sm" variant="outline" onClick={() => basket.remove(unavailable.map((l) => l.itemId))}>Take {unavailable.length === 1 ? "it" : "them"} out</Button>
            </div>
          )}

          <div role="group" aria-label="How you get your order" className="flex self-start rounded-full bg-ground-2 p-1">
            {(["delivery", "collect"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={b.mode === m}
                onClick={() => basket.set({ mode: m })}
                className={cn("h-10 rounded-full px-5 font-semibold", b.mode === m ? "bg-panel text-ink shadow-sm" : "text-ink-2")}
              >
                {m === "delivery" ? "Delivery" : "Collect"}
              </button>
            ))}
          </div>

          <section className={card}>
            {b.mode === "delivery" ? (
              <>
                <h2 className="font-bold">Delivery to</h2>
                <PlacePicker places={places} value={b.placeId} onChange={(id) => { basket.set({ placeId: id }); setPlaceError(null); }} error={placeError} />
                <TextField label="Directions for the rider" maxLength={300} value={b.directions} onChange={(e) => basket.set({ directions: e.target.value })} placeholder="Gate, building, floor" hint="The rider calls the number below when they're close." />
              </>
            ) : (
              <>
                <h2 className="font-bold">Collect at the counter</h2>
                <p className="text-body text-ink-2">Bamboo Cask, Keiyo Road, Ngara. We&rsquo;ll have it ready; this page shows when.</p>
              </>
            )}
          </section>

          <section className={card}>
            <h2 className="font-bold">{b.mode === "delivery" ? "Who's receiving it" : "Who's collecting it"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />
              <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required />
            </div>
            {!signedIn && (
              <p className="text-fine text-ink-2">
                <Link href="/sign-in" className="font-semibold text-action underline">Sign in</Link> to keep your orders together and open the Cask Room.
              </p>
            )}
          </section>

          <section className={card}>
            <h2 className="font-bold">How you&rsquo;ll pay</h2>
            <p className="text-body">
              {b.mode === "delivery" ? "Pay the rider at the door, cash or M-Pesa." : "Pay at the counter when you collect, cash or M-Pesa."}
            </p>
            {hasAlcohol && (
              <p className="text-fine text-ink-2">
                {b.mode === "delivery" ? "The rider checks ID and can't leave alcohol with anyone under 18." : "Show your ID at the counter when you collect."}
              </p>
            )}
          </section>

          <section className={card}>
            <h2 className="font-bold">Your order</h2>
            <ul className="flex flex-col gap-1.5">
              {ok.map((l) => (
                <li key={`${l.itemId}:${l.option}`} className="flex justify-between gap-3">
                  <span>{l.qty > 1 ? `${l.qty} × ` : ""}{lineName(l.item, l.option)}</span>
                  <span className="shrink-0">{formatKes(l.qty * l.item!.price)}</span>
                </li>
              ))}
            </ul>
            <TextAreaField label="A note for the kitchen" rows={2} maxLength={300} value={b.note} onChange={(e) => basket.set({ note: e.target.value })} />
          </section>

          <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-1.5 border-t border-line bg-panel px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-ink-2"><span>Food and drinks</span><span>KES {formatKes(subtotal)}</span></div>
            {b.mode === "delivery" && (
              <div className="flex justify-between text-ink-2">
                <span>Delivery{place ? `, ${place.km} km` : ""}</span>
                <span>{place ? `KES ${formatKes(fee)}` : "Choose a place"}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-bold">To pay</span>
              <Price amount={subtotal + fee} size="xl" />
            </div>
            {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
            <Button type="submit" variant="main" size="lg" block disabled={pending || !ok.length} className="mt-1.5">
              {pending ? "Placing your order…" : "Place order"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
