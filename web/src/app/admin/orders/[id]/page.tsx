import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getOrderDetail } from "@/db/queries/orders";
import { nextAction, OPEN, PAYMENT_LABEL, stepsFor, TUMABODA_STATUS } from "@/lib/order-status";
import { needsAttention } from "@/lib/tumaboda-core";
import { tumabodaEnabled } from "@/lib/tumaboda";
import { displayPhone } from "@/lib/phone";
import { NoAccess } from "@/components/admin-shell/no-access";
import { requestTime } from "@/lib/clock";
import { Tag } from "@/components/ui/pill";
import { formatKes, Price } from "@/components/ui/price";
import { CallRider, CancelOrder, LiveRefresh, NextStep } from "./order-actions";

export const metadata: Metadata = { title: "Order" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" });
const card = "flex flex-col gap-1.5 rounded-2xl border border-line bg-panel p-4";

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: me, denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} path={`/admin/orders/${id}`} />;
  if (!UUID.test(id)) notFound();
  const d = await getOrderDetail(id);
  if (!d) notFound();
  const { o, place, customer, lines, events } = d;

  const canUpdate = can(me.role, { order: ["update"] });
  const step = nextAction(o.mode, o.status);
  const isOpen = OPEN.includes(o.status);
  const statusLabel = o.status === "cancelled" ? "Cancelled" : o.status === "awaiting_payment" ? "Waiting for payment" : stepsFor(o.mode).find((s) => s.status === o.status)?.label;
  const minutes = Math.floor((requestTime() - o.createdAt.getTime()) / 60_000);
  const riderTrouble = needsAttention(o.tumabodaStatus) || !!o.tumabodaError;

  return (
    <>
      <LiveRefresh orderId={o.id} />
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5 md:px-5">
        <Link href="/admin" className="-ml-2 flex h-10 items-center gap-1 rounded-full px-2 font-semibold"><ChevronLeft aria-hidden className="size-5" /> Orders</Link>
        <h1 className="figures text-h3">{o.code}</h1>
        <Tag tone={o.status === "cancelled" ? "danger" : isOpen ? (minutes >= 30 ? "danger" : minutes >= 15 ? "warn" : "ok") : "neutral"}>
          {statusLabel}{isOpen ? `, ${minutes} min` : ""}
        </Tag>
        {canUpdate && isOpen && (
          <div className="ml-auto flex flex-wrap gap-2">
            {step && <NextStep orderId={o.id} to={step.to} label={step.label} main={o.status === "received"} />}
          </div>
        )}
      </div>

      <main className="flex flex-wrap items-start gap-5 p-4 md:p-5">
        <section aria-label="Ticket" className="flex max-w-[440px] flex-[1_1_340px] flex-col gap-2.5 rounded-t-[4px] rounded-b-2xl bg-card px-5 py-5 shadow-[0_1px_0_var(--line),0_8px_18px_rgb(20_41_28/.12)]">
          <ul className="flex flex-col gap-2.5">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 text-[1.0625rem]">
                <span><b>{l.qty}</b> {l.name}{l.option ? `, ${l.option.toLowerCase()}` : ""}</span>
                <span>{formatKes(l.qty * l.unitPrice)}</span>
              </li>
            ))}
          </ul>
          {o.note && <p className="rounded-xl bg-warn-soft px-3 py-2.5"><b>Note for the kitchen:</b> {o.note}</p>}
          {o.hasAlcohol && <Tag tone="danger" className="self-start">18+: check ID at handover</Tag>}
          <div className="flex flex-col gap-1 border-t border-dashed border-line pt-2.5 text-ink-2">
            <div className="flex justify-between"><span>Food and drinks</span><span>{formatKes(o.subtotal)}</span></div>
            {o.mode === "delivery" && <div className="flex justify-between"><span>Delivery{o.deliveryKm ? `, ${o.deliveryKm} km` : ""}</span><span>{formatKes(o.deliveryFee)}</span></div>}
          </div>
          <div className="flex items-baseline justify-between"><span className="font-bold">Total</span><Price amount={o.total} size="xl" /></div>
        </section>

        <div className="grid min-w-0 flex-[999_1_380px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          <section className={card}>
            <h2 className="mb-1 font-bold text-ink-2">Customer</h2>
            <span className="text-lead font-bold">{o.customerName}</span>
            <a href={`tel:${o.phone}`} className="font-semibold text-action underline">{displayPhone(o.phone)}</a>
            <span className="text-fine text-ink-2">
              {customer ? "Signed in" : "Guest"}, {d.ordersFromPhone === 1 ? "first order from this number" : `${d.ordersFromPhone} orders from this number`}
            </span>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-bold text-ink-2">{o.mode === "delivery" ? "Delivery" : "Collection"}</h2>
            {o.mode === "delivery" ? (
              <>
                <span className="text-lead font-bold">{place?.name}</span>
                {o.directions && <span>{o.directions}</span>}
                {o.tumabodaStatus && <Tag tone={needsAttention(o.tumabodaStatus) ? "danger" : "ok"} className="self-start">{TUMABODA_STATUS[o.tumabodaStatus] ?? o.tumabodaStatus}</Tag>}
                {o.tumabodaDeliveryNumber && <span className="text-fine text-ink-2">TumaBoda {o.tumabodaDeliveryNumber}</span>}
                {o.tumabodaTrackingUrl && <a href={o.tumabodaTrackingUrl} target="_blank" rel="noreferrer" className="text-fine font-semibold text-action underline">Follow the rider</a>}
                {o.tumabodaError && <p role="alert" className="text-fine font-semibold text-danger">{o.tumabodaError}</p>}
                {canUpdate && (o.status === "preparing" || o.status === "ready") && (!o.tumabodaDeliveryId || riderTrouble) && (
                  <div className="mt-1">
                    {tumabodaEnabled() ? <CallRider orderId={o.id} again={riderTrouble} /> : <span className="text-fine text-ink-2">TumaBoda isn&rsquo;t set up: arrange the rider by phone.</span>}
                  </div>
                )}
              </>
            ) : (
              <span>At the counter, Keiyo Road</span>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-1 font-bold text-ink-2">Payment</h2>
            <span className="text-lead font-bold">{PAYMENT_LABEL[o.paymentMethod]}</span>
            <span className="text-ink-2">{o.paymentStatus === "paid" ? "Paid" : o.paymentMethod === "pay_on_delivery" ? `The rider collects KES ${formatKes(o.total)}` : `KES ${formatKes(o.total)} at the counter`}</span>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-bold text-ink-2">History</h2>
            <ol className="flex flex-col gap-1">
              {events.map((e) => (
                <li key={e.id}>
                  <b>{time(e.at)}</b> {e.status === "cancelled" ? "Cancelled" : stepsFor(o.mode).find((s) => s.status === e.status)?.label ?? e.status}, {e.byName}
                  {e.note ? <span className="block text-fine text-ink-2">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>

          {canUpdate && isOpen && (
            <section className="col-span-full flex justify-end">
              <CancelOrder orderId={o.id} code={o.code} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export default function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading the order…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
