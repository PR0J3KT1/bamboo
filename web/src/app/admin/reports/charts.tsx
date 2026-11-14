import { formatKes } from "@/components/ui/price";
import { niceScale } from "@/lib/reports-core";
import { cn } from "@/lib/utils";

/* Hand-built charts for the reports, rendered on the server. Hover and keyboard focus show a
   tooltip with CSS alone. Marks follow the dataviz rules: columns at most 24px wide with a 4px
   rounded top and a square base, hairline solid grid, text in ink (never the series colour), and
   every chart has a table under "Show as a table". */

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000).toLocaleString("en-KE")}K` : n.toLocaleString("en-KE"));

export type Column = { key: string; label: string; tick: string | null; value: number; detail: string };

/** One series of columns: sales by day or by hour. The tallest column is labelled. */
export function ColumnChart({ columns, title }: { columns: Column[]; title: string }) {
  const max = Math.max(0, ...columns.map((c) => c.value));
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = max > 0 ? columns.findIndex((c) => c.value === max) : -1;
  const n = columns.length;
  return (
    <figure className="m-0 pt-3">
      <div className="flex gap-2" role="img" aria-label={`${title}. Highest ${peak >= 0 ? `${columns[peak].label}, KES ${formatKes(max)}` : "none"}.`}>
        {/* value axis */}
        <div className="relative h-56 w-12 shrink-0 text-fine tabular-nums text-ink-2" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {ticks.map((t) => (
              <div key={t} aria-hidden className="absolute inset-x-0 h-px bg-grid" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex">
              {columns.map((c, i) => {
                const h = (c.value / top) * 100;
                return (
                  <div
                    key={c.key}
                    tabIndex={0}
                    aria-label={`${c.label}: ${c.detail}`}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md px-[1px] outline-none hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {c.value > 0 && <div className="w-full max-w-6 rounded-t-[4px] bg-series-1" style={{ height: `${h}%` }} />}
                    {i === peak && (
                      <span aria-hidden className="pointer-events-none absolute whitespace-nowrap text-fine font-semibold text-ink group-hover:invisible group-focus-visible:invisible" style={{ bottom: `calc(${h}% + 4px)` }}>
                        {formatKes(c.value)}
                      </span>
                    )}
                    <span
                      role="tooltip"
                      className={cn(
                        "pointer-events-none hidden absolute z-10 w-max max-w-56 rounded-lg bg-grove px-3 py-2 text-fine text-on-grove shadow-lg group-hover:block group-focus-visible:block",
                        i < 2 ? "left-0" : i > n - 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                      )}
                      style={{ bottom: `calc(${Math.max(h, 0)}% + 8px)` }}
                    >
                      <span className="block font-semibold">{c.label}</span>
                      {c.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* time axis */}
          <div className="mt-1.5 flex text-fine tabular-nums text-ink-2" aria-hidden>
            {columns.map((c) => (
              <span key={c.key} className="relative flex-1">
                {c.tick && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{c.tick}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

export type Part = { key: string; label: string; value: number; note?: string };
const SWATCH = ["bg-series-1", "bg-series-2", "bg-series-3"] as const;
const ON = ["text-on-series-1", "text-on-series-2", "text-on-series-3"] as const;

/** One whole split into up to three parts, each its share printed inside when it fits. */
export function SplitBar({ parts, title }: { parts: Part[]; title: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  if (!total) return <p className="text-ink-2">Nothing sold in this period.</p>;
  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex h-7 gap-[2px]" role="img" aria-label={`${title}: ${parts.map((p) => `${p.label} ${pct(p.value)}%`).join(", ")}`}>
        {parts.map((p, i) =>
          p.value > 0 ? (
            <div
              key={p.key}
              tabIndex={0}
              aria-label={`${p.label}: KES ${formatKes(p.value)}, ${pct(p.value)}%`}
              className={cn("group relative flex min-w-[3px] items-center rounded-[4px] px-2 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2", SWATCH[i])}
              style={{ flexGrow: p.value, flexBasis: 0 }}
            >
              {pct(p.value) >= 12 && <span className={cn("text-fine font-bold tabular-nums", ON[i])}>{pct(p.value)}%</span>}
              <span role="tooltip" className={cn("pointer-events-none hidden absolute bottom-full z-10 mb-2 w-max rounded-lg bg-grove px-3 py-2 text-fine text-on-grove shadow-lg group-hover:block group-focus-visible:block", i === parts.length - 1 ? "right-0" : "left-0")}>
                <span className="block font-semibold">{p.label}</span>
                KES {formatKes(p.value)}, {pct(p.value)}%{p.note ? `, ${p.note}` : ""}
              </span>
            </div>
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {parts.map((p, i) => (
          <li key={p.key} className="flex flex-wrap items-center gap-x-2">
            <span aria-hidden className={cn("size-3 rounded-[3px]", SWATCH[i])} />
            <span className="whitespace-nowrap font-semibold">{p.label}</span>
            <span className="tabular-nums text-ink-2">
              KES {formatKes(p.value)}
              {p.value > 0 && pct(p.value) < 12 ? `, ${pct(p.value) < 1 ? "under 1" : pct(p.value)}%` : ""}
              {p.note ? `, ${p.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export type Row = { key: string; name: string; sub?: string; value: number; shown: string; aside?: string };

/** Ranked rows with a bar for the measure being ranked, value at the bar's end. */
export function BarList({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="flex flex-col">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line-2 py-2 last:border-0 md:grid-cols-[13rem_minmax(0,1fr)_8rem]">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{r.name}</span>
            {r.sub && <span className="block truncate text-fine text-ink-2">{r.sub}</span>}
          </span>
          <span aria-hidden className="order-last col-span-2 mt-1 flex items-center md:order-none md:col-span-1 md:mt-0">
            <span className="h-3 rounded-r-[4px] bg-series-1" style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
          </span>
          <span className="text-right tabular-nums">
            <span className="font-semibold">{r.shown}</span>
            {r.aside && <span className="block text-fine text-ink-2">{r.aside}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The same numbers as a plain table, folded away. */
export function TableView({ head, rows, summary = "Show as a table" }: { head: string[]; rows: (string | number)[][]; summary?: string }) {
  return (
    <details className="group text-fine">
      <summary className="inline-flex h-10 cursor-pointer items-center font-semibold text-action underline-offset-2 hover:underline">{summary}</summary>
      <div className="mt-1 max-h-80 overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-panel-2">
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" className={cn("px-3 py-2 font-semibold text-ink-2", i > 0 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, j) => (
              <tr key={j} className="border-t border-line-2">
                {r.map((c, i) => (
                  <td key={i} className={cn("px-3 py-1.5", i > 0 && "text-right tabular-nums")}>{typeof c === "number" ? c.toLocaleString("en-KE") : c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
