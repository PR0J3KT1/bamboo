import type { Metadata } from "next";
import { Suspense } from "react";
import { desc, gte, notInArray, or } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { todayInNairobi } from "@/lib/age";
import { PAYMENT_LABEL, stepsFor, type OrderStatus } from "@/lib/order-status";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Tag } from "@/components/ui/pill";
import { formatKes } from "@/components/ui/price";

export const metadata: Metadata = { title: "Orders" };

function statusLabel(mode: "delivery" | "collect", status: OrderStatus) {
  if (status === "cancelled") return "Cancelled";
  if (status === "awaiting_payment") return "Waiting for payment";
  return stepsFor(mode).find((s) => s.status === status)?.label ?? status;
}

/* Today's orders, plus any still open from earlier. The ticket rail replaces this list in phase 4. */
async function Orders() {
  const { denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} />;

  // midnight in Nairobi (UTC+3, no daylight saving)
  const since = new Date(`${todayInNairobi()}T00:00:00+03:00`);
  const rows = await db
    .select({
      o: schema.orders,
      place: schema.deliveryPlaces.name,
      items: sql<number>`(select coalesce(sum(qty), 0)::int from ${schema.orderLines} where ${schema.orderLines.orderId} = ${schema.orders.id})`,
    })
    .from(schema.orders)
    .leftJoin(schema.deliveryPlaces, eq(schema.orders.placeId, schema.deliveryPlaces.id))
    .where(or(gte(schema.orders.createdAt, since), notInArray(schema.orders.status, ["completed", "cancelled"])))
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);

  const open = rows.filter((r) => r.o.status !== "completed" && r.o.status !== "cancelled").length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-h2 font-extrabold uppercase">Orders</h1>
        <p className="text-ink-2">
          {rows.length === 0 ? "No orders yet today." : `${open} open, ${rows.length} today or still open`}
        </p>
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="text-fine font-semibold text-ink-2">
                {["Order", "Placed", "For", "Items", "Total, KES", "Payment", "Status"].map((h) => (
                  <th key={h} scope="col" className={`border-b border-line px-4 py-3 ${h === "Total, KES" || h === "Items" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, place, items }) => (
                <tr key={o.id} className="border-b border-line-2 last:border-0">
                  <td className="px-4 py-3 figures text-[1.25rem]">{o.code}</td>
                  <td className="px-4 py-3">
                    {o.createdAt.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      <span className="font-semibold">{o.customerName}</span>
                      <span className="text-fine text-ink-2">{o.mode === "delivery" ? `Delivery to ${place}` : "Collect at the counter"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{items}</td>
                  <td className="px-4 py-3 text-right figures text-[1.25rem]">{formatKes(o.total)}</td>
                  <td className="px-4 py-3">{PAYMENT_LABEL[o.paymentMethod]}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      <Tag tone={o.status === "cancelled" ? "danger" : o.status === "completed" ? "neutral" : "ok"}>{statusLabel(o.mode, o.status)}</Tag>
                      {o.hasAlcohol && <Tag tone="danger">18+</Tag>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading orders…</p>}>
      <Orders />
    </Suspense>
  );
}
