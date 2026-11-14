import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PAYMENT_LABEL, stepsFor } from "@/lib/order-status";
import { formatKes, Price } from "@/components/ui/price";
import { buttonStyles } from "@/components/ui/button";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { KeepFresh } from "./keep-fresh";

export const metadata: Metadata = { title: "Your order" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* The tracking page. Its address holds the order's random id, so only someone with the link
   can see it; the short code (BC-1001) is for reading out loud. */
async function Tracking({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [order] = await db
    .select({ o: schema.orders, place: schema.deliveryPlaces.name })
    .from(schema.orders)
    .leftJoin(schema.deliveryPlaces, eq(schema.orders.placeId, schema.deliveryPlaces.id))
    .where(eq(schema.orders.id, id))
    .limit(1);
  if (!order) notFound();
  const o = order.o;
  const [lines, events] = await Promise.all([
    db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, o.id)).orderBy(asc(schema.orderLines.id)),
    db.select({ status: schema.orderEvents.status, at: schema.orderEvents.at }).from(schema.orderEvents).where(eq(schema.orderEvents.orderId, o.id)).orderBy(asc(schema.orderEvents.at)),
  ]);
  const when = (status: string) => {
    const e = events.findLast((x) => x.status === status);
    return e ? e.at.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" }) : null;
  };

  const lounge = process.env.LOUNGE_PHONE ? normalizeKenyanPhone(process.env.LOUNGE_PHONE) : null;
  const steps = stepsFor(o.mode);
  const cancelled = o.status === "cancelled";
  const at = steps.findIndex((s) => s.status === o.status);
  const current = cancelled ? null : steps[Math.max(0, at)];
  const done = o.status === "completed" || cancelled;
  const placed = o.createdAt.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" }).replace(/\s?([ap])\.?m\.?$/i, (_m, x: string) => ` ${x.toLowerCase()}m`);

  return (
    <>
      <KeepFresh id={o.id} active={!done} />
      <header className="grove-bg relative text-on-grove">
        {/* the glow of the coals */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_85%_0%,rgb(201_138_30/0.32),rgb(201_138_30/0)_60%)]" />
        <div className="relative mx-auto flex max-w-2xl flex-col gap-3.5 px-4 pt-4 pb-7">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Order {o.code}</span>
            <Link href="/" className="flex h-11 items-center font-semibold text-on-grove">Menu</Link>
          </div>
          <h1 className="font-stencil text-[3.5rem] leading-[.9] font-black uppercase" aria-live="polite">
            {cancelled ? "Cancelled" : current!.headline}
          </h1>
          <p className="font-serif text-lead text-lime italic">
            {cancelled
              ? o.cancelReason
                ? `Cancelled by the lounge: ${o.cancelReason}`
                : "This order was cancelled. Call the lounge if that's a surprise."
              : o.mode === "delivery"
                ? `Placed at ${placed}, for delivery to ${order.place}.`
                : `Placed at ${placed}, to collect at the counter.`}
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        {!cancelled && (
          <ol aria-label="Order progress" className="flex flex-col">
            {steps.map((s, i) => {
              const state = i < at ? "done" : i === at ? "now" : "todo";
              const last = i === steps.length - 1;
              return (
                <li key={s.status} aria-current={state === "now" ? "step" : undefined} className="flex min-h-13 gap-3.5">
                  <div className="flex w-5 flex-col items-center">
                    <span
                      className={cn(
                        "shrink-0 rounded-full",
                        state === "done" && "size-4 bg-action",
                        state === "now" && "size-5 border-[3px] border-action bg-lime",
                        state === "todo" && "size-4 border-2 border-line",
                      )}
                    />
                    {!last && <span className={cn("my-0.5 w-0.5 flex-1", i < at ? "bg-action" : "bg-line")} />}
                  </div>
                  <span className="flex flex-col pb-3">
                    <span className={state === "todo" ? "text-ink-2" : "font-bold"}>{s.label}</span>
                    {state !== "todo" && when(s.status) && <span className="text-fine text-ink-2">{when(s.status)}</span>}
                    {s.status === "out_for_delivery" && state === "now" && o.tumabodaTrackingUrl && (
                      <a href={o.tumabodaTrackingUrl} target="_blank" rel="noreferrer" className="text-fine font-semibold text-action underline">
                        Follow the rider on the map
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <section className="flex flex-col gap-1.5 rounded-2xl border border-line bg-panel p-4">
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-3">
              <span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.name}{l.option ? ` (${l.option.toLowerCase()})` : ""}</span>
              <span className="shrink-0">{formatKes(l.qty * l.unitPrice)}</span>
            </div>
          ))}
          {o.deliveryFee > 0 && (
            <div className="flex justify-between text-ink-2"><span>Delivery to {order.place}</span><span>{formatKes(o.deliveryFee)}</span></div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
            <span className="font-bold">{PAYMENT_LABEL[o.paymentMethod]}</span>
            <Price amount={o.total} size="lg" />
          </div>
        </section>

        {o.note && <p className="text-body text-ink-2">Your note: {o.note}</p>}
        {lounge && (
          <a href={`tel:${lounge}`} className={buttonStyles({ variant: "outline", size: "lg", block: true })}>
            Call the lounge, {displayPhone(lounge)}
          </a>
        )}
      </main>
    </>
  );
}

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-ink-2">Loading your order…</p>}>
      <Tracking params={props.params} />
    </Suspense>
  );
}
