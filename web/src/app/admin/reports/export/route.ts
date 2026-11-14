import { NotAllowed, requirePermission } from "@/lib/session";
import { todayInNairobi } from "@/lib/age";
import { requestTime } from "@/lib/clock";
import { parsePeriod, toCsv } from "@/lib/reports-core";
import { exportOrders, getSellers, PAYMENT_NAMES } from "@/db/queries/reports";
import { audit } from "@/lib/audit";
import { db } from "@/db";

/* The report's period as a CSV for the bookkeeper: every order (with its status), or the items
   sold on completed orders. Amounts are whole KES. Admins only. */
export async function GET(req: Request) {
  let me;
  try {
    me = await requirePermission({ report: ["view"] });
  } catch (e) {
    if (e instanceof NotAllowed) return new Response("Not allowed", { status: e.reason === "signed-out" ? 401 : 403 });
    throw e;
  }
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const { period: p, problem } = parsePeriod(sp, todayInNairobi(new Date(requestTime())));
  if (problem) return new Response(problem, { status: 400 });
  const kind = sp.kind === "items" ? "items" : "orders";

  let body: string;
  if (kind === "orders") {
    const rows = await exportOrders(p);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    body = toCsv(
      ["Date", "Time", "Order", "Status", "Delivery or collect", "Area", "Payment", "Items", "Items KES", "Discount KES", "Sales KES", "Delivery fee KES", "Total KES", "Cancel reason"],
      rows.map((r) => {
        const parts = Object.fromEntries(fmt.formatToParts(r.at).map((x) => [x.type, x.value]));
        return [
          `${parts.year}-${parts.month}-${parts.day}`,
          `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
          r.code,
          r.status.replace(/_/g, " "),
          r.mode === "collect" ? "Collect" : "Delivery",
          r.place ?? "",
          PAYMENT_NAMES[r.paymentMethod] ?? r.paymentMethod,
          r.items ?? "",
          r.subtotal,
          r.discount,
          r.subtotal - r.discount,
          r.deliveryFee,
          r.total,
          r.cancelReason ?? "",
        ];
      }),
    );
  } else {
    const rows = await getSellers(p);
    body = toCsv(["Item", "Menu section", "Quantity sold", "Sales KES"], rows.map((r) => [r.name, r.section, r.qty, r.value]));
  }
  await audit(db, me, "report.export", { type: "report", id: kind }, null, { from: p.from, to: p.to });

  const name = `bamboo-cask-${kind === "items" ? "items-sold" : "orders"}-${p.from}${p.days > 1 ? `-to-${p.to}` : ""}.csv`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
