import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { NoAccess } from "@/components/admin-shell/no-access";
import { formatKes, Price } from "@/components/ui/price";
import { todayInNairobi } from "@/lib/age";
import { requestTime } from "@/lib/clock";
import { parsePeriod, percentChange, previousPeriod, type Period } from "@/lib/reports-core";
import { getAreas, getCancellations, getMix, getPayments, getSalesOverTime, getSellers, getTotals } from "@/db/queries/reports";
import { BarList, ColumnChart, SplitBar, TableView, type Column } from "./charts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const TZ = "Africa/Nairobi";
const dayName = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00+03:00`).toLocaleDateString("en-KE", { timeZone: TZ, ...opts });

function periodText(p: Period) {
  if (p.days === 1) return dayName(p.from, { weekday: "long", day: "numeric", month: "long" });
  const sameMonth = p.from.slice(0, 7) === p.to.slice(0, 7);
  return `${dayName(p.from, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} to ${dayName(p.to, { day: "numeric", month: "short", year: "numeric" })}`;
}

function query(p: Period, extra: Record<string, string> = {}) {
  const q = new URLSearchParams(p.key === "custom" ? { p: "custom", from: p.from, to: p.to } : { p: p.key });
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-KE")} ${n === 1 ? one : many}`;

function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-panel p-4 md:p-5", className)}>
      <div>
        <h2 className="text-lead font-bold">{title}</h2>
        {note && <p className="text-fine text-ink-2">{note}</p>}
      </div>
      {children}
    </section>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  const { denied } = await checkPermission({ report: ["view"] });
  if (denied) return <NoAccess reason={denied} path="/admin/reports" />;
  const sp = await searchParams;
  const today = todayInNairobi(new Date(requestTime()));
  const { period: p, problem } = parsePeriod(sp, today);
  const byKes = sp.by === "kes";
  const before = previousPeriod(p);

  const [totals, prior, overTime, mix, payments, sellers, areas, cancelled] = await Promise.all([
    getTotals(p),
    getTotals(before),
    getSalesOverTime(p),
    getMix(p),
    getPayments(p),
    getSellers(p),
    getAreas(p),
    getCancellations(p),
  ]);

  const change = percentChange(totals.sales, prior.sales);
  const average = totals.orders ? Math.round(totals.sales / totals.orders) : 0;
  const columns: Column[] = overTime.buckets.map((b, i) => {
    const hourly = overTime.unit === "hour";
    const label = hourly ? `${b.key}:00 to ${String((Number(b.key) + 1) % 24).padStart(2, "0")}:00` : dayName(b.key, { weekday: "short", day: "numeric", month: "short" });
    const every = Math.ceil(overTime.buckets.length / 7); // few enough labels to fit at phone width
    const day = b.key.slice(8);
    const tick = i % every !== 0 ? null : hourly ? `${b.key}:00` : i === 0 || day === "01" ? dayName(b.key, { day: "numeric", month: "short" }) : String(Number(day));
    return { key: b.key, label, tick, value: b.sales, detail: `KES ${formatKes(b.sales)}, ${plural(b.orders, "order")}` };
  });
  const ranked = [...sellers].sort((a, b) => (byKes ? b.value - a.value || b.qty - a.qty : b.qty - a.qty || b.value - a.value)).slice(0, 10);

  const tab = (on: boolean) => cn("flex h-10 items-center rounded-full px-4 font-semibold", on ? "bg-panel shadow-sm" : "text-ink-2 hover:text-ink");
  const download = "inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line bg-panel px-4 font-semibold hover:bg-panel-2";

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 md:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 font-extrabold uppercase">Reports</h1>
          <p className="text-ink-2">{periodText(p)}, Nairobi time. Sales count completed orders only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/reports/export?${query(p, { kind: "orders" })}`} className={download} download>
            <Download aria-hidden className="size-4" /> Orders CSV
          </a>
          <a href={`/admin/reports/export?${query(p, { kind: "items" })}`} className={download} download>
            <Download aria-hidden className="size-4" /> Items sold CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <nav aria-label="Period" className="flex rounded-full bg-ground p-1">
          <Link href="/admin/reports?p=today" aria-current={p.key === "today" ? "page" : undefined} className={tab(p.key === "today")}>Today</Link>
          <Link href="/admin/reports?p=7d" aria-current={p.key === "7d" ? "page" : undefined} className={tab(p.key === "7d")}>7 days</Link>
          <Link href="/admin/reports?p=30d" aria-current={p.key === "30d" ? "page" : undefined} className={tab(p.key === "30d")}>30 days</Link>
        </nav>
        <form className={cn("flex flex-wrap items-center gap-2 rounded-full p-1 pl-4", p.key === "custom" ? "bg-panel shadow-sm" : "bg-ground")}>
          <input type="hidden" name="p" value="custom" />
          <label htmlFor="rf" className="font-semibold">From</label>
          <input id="rf" name="from" type="date" required max={today} defaultValue={p.from} className="h-10 rounded-full border border-line bg-card px-3" />
          <label htmlFor="rt" className="font-semibold">to</label>
          <input id="rt" name="to" type="date" required max={today} defaultValue={p.to} className="h-10 rounded-full border border-line bg-card px-3" />
          <button type="submit" className="h-10 rounded-full bg-action px-4 font-semibold text-on-action">Show</button>
        </form>
      </div>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-warn-ink">{problem}</p>}

      {/* the figures */}
      <section aria-label="Totals" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-1 bg-panel p-4 md:p-5">
          <span className="font-semibold text-ink-2">Sales</span>
          <Price amount={totals.sales} size="xl" />
          <span className="text-fine text-ink-2">
            {change === null ? "Nothing to compare with in the period before." : `${change > 0 ? "Up" : change < 0 ? "Down" : "Level"}${change ? ` ${Math.abs(change)}%` : ""} on the ${p.days === 1 ? "day" : `${p.days} days`} before (KES ${formatKes(prior.sales)})`}
          </span>
        </div>
        <div className="flex flex-col gap-1 bg-panel p-4 md:p-5">
          <span className="font-semibold text-ink-2">Orders completed</span>
          <span className="figures text-[1.75rem] leading-none">{totals.orders.toLocaleString("en-KE")}</span>
          {totals.open > 0 && <span className="text-fine text-ink-2">{plural(totals.open, "more order")} still open, not counted</span>}
        </div>
        <div className="flex flex-col gap-1 bg-panel p-4 md:p-5">
          <span className="font-semibold text-ink-2">Average order</span>
          <Price amount={average} size="lg" />
          <span className="text-fine text-ink-2">Delivery fees for riders: KES {formatKes(totals.deliveryFees)}, not in sales</span>
        </div>
        <div className="flex flex-col gap-1 bg-panel p-4 md:p-5">
          <span className="font-semibold text-ink-2">Cancelled</span>
          <span className="figures text-[1.75rem] leading-none">{totals.cancelled.toLocaleString("en-KE")}</span>
          <span className="text-fine text-ink-2">{totals.cancelled ? `Worth KES ${formatKes(totals.cancelledValue)}` : "None"}</span>
        </div>
      </section>

      <Panel title={overTime.unit === "hour" ? "Sales by the hour" : "Sales by day"} note={overTime.unit === "hour" ? "When each completed order was placed." : undefined}>
        {totals.orders === 0 ? (
          <p className="text-ink-2">No completed orders {p.days === 1 ? "today" : "in this period"} yet.</p>
        ) : (
          <>
            <ColumnChart columns={columns} title={overTime.unit === "hour" ? "Sales by the hour" : "Sales by day"} />
            <TableView head={[overTime.unit === "hour" ? "Hour" : "Day", "Orders", "Sales, KES"]} rows={overTime.buckets.map((b, i) => [columns[i].label, b.orders, b.sales])} />
          </>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What sold" note="Value of the items on completed orders, before discounts.">
          <SplitBar title="What sold" parts={mix} />
          <TableView head={["Part of the menu", "KES"]} rows={mix.map((m) => [m.label, m.value])} />
        </Panel>
        <Panel title="How they paid">
          <SplitBar title="How they paid" parts={payments.map((m) => ({ key: m.key, label: m.label, value: m.value, note: plural(m.orders ?? 0, "order") }))} />
          <TableView head={["Payment", "Orders", "KES"]} rows={payments.map((m) => [m.label, m.orders ?? 0, m.value])} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best sellers">
          <nav aria-label="Rank best sellers by" className="flex self-start rounded-full bg-ground p-1">
            <Link href={`/admin/reports?${query(p)}`} scroll={false} aria-current={!byKes ? "page" : undefined} className={tab(!byKes)}>By quantity</Link>
            <Link href={`/admin/reports?${query(p, { by: "kes" })}`} scroll={false} aria-current={byKes ? "page" : undefined} className={tab(byKes)}>By KES</Link>
          </nav>
          {ranked.length ? (
            <>
              <BarList
                rows={ranked.map((s) => ({
                  key: s.itemId,
                  name: s.name,
                  sub: s.section,
                  value: byKes ? s.value : s.qty,
                  shown: byKes ? `KES ${formatKes(s.value)}` : `${s.qty.toLocaleString("en-KE")} sold`,
                  aside: byKes ? `${s.qty.toLocaleString("en-KE")} sold` : `KES ${formatKes(s.value)}`,
                }))}
              />
              <TableView summary={`All ${plural(sellers.length, "item")} sold, as a table`} head={["Item", "Sold", "KES"]} rows={sellers.map((s) => [s.name, s.qty, s.value])} />
            </>
          ) : (
            <p className="text-ink-2">Nothing sold in this period.</p>
          )}
        </Panel>
        <Panel title="Where orders went" note="Completed orders, by delivery area.">
          {areas.length ? (
            <>
              <BarList rows={areas.slice(0, 12).map((a) => ({ key: a.key, name: a.name, value: a.orders, shown: plural(a.orders, "order"), aside: `KES ${formatKes(a.sales)}` }))} />
              <TableView head={["Area", "Orders", "KES"]} rows={areas.map((a) => [a.name, a.orders, a.sales])} />
            </>
          ) : (
            <p className="text-ink-2">No completed orders in this period.</p>
          )}
        </Panel>
      </div>

      <Panel title="Cancelled orders" note={cancelled.length ? "Not counted in sales. Newest first." : undefined}>
        {cancelled.length ? (
          <ul className="flex flex-col">
            {cancelled.map((c) => (
              <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-line-2 py-2 last:border-0">
                <Link href={`/admin/orders/${c.id}`} className="font-bold text-action underline-offset-2 hover:underline">{c.code}</Link>
                <span className="min-w-0">
                  {c.reason || "No reason given"}
                  <span className="block text-fine text-ink-2">
                    {c.customerName}, {c.createdAt.toLocaleString("en-KE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </span>
                <span className="tabular-nums">KES {formatKes(c.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2">No orders were cancelled in this period.</p>
        )}
      </Panel>
    </main>
  );
}

export default function ReportsPage(props: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading reports…</p>}>
      <Reports searchParams={props.searchParams} />
    </Suspense>
  );
}
