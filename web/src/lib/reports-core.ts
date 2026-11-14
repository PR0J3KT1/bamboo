/* Pure helpers for the reports: the period, the day list, nice axis steps and CSV.
   Dates are "YYYY-MM-DD" calendar days in Nairobi time (UTC+3 all year, no daylight saving). */

export type PeriodKey = "today" | "7d" | "30d" | "custom";

export type Period = {
  key: PeriodKey;
  from: string; // first day, inclusive
  to: string; // last day, inclusive
  days: number;
  /** For the SQL: [start, end) as instants. */
  start: Date;
  end: Date;
};

export const MAX_DAYS = 92;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd);
}
export function addDays(d: string, n: number): string {
  return new Date(toUtc(d) + n * 86_400_000).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000) + 1;
}
function isRealDay(d: string) {
  return DAY.test(d) && new Date(toUtc(d)).toISOString().slice(0, 10) === d;
}
export const nairobiStart = (d: string) => new Date(`${d}T00:00:00+03:00`);

function make(key: PeriodKey, from: string, to: string): Period {
  return { key, from, to, days: daysBetween(from, to), start: nairobiStart(from), end: nairobiStart(addDays(to, 1)) };
}

/** Read the period from the address. Anything odd falls back to the last 7 days, with a reason. */
export function parsePeriod(sp: { p?: unknown; from?: unknown; to?: unknown }, today: string): { period: Period; problem?: string } {
  const p = typeof sp.p === "string" ? sp.p : "7d";
  if (p === "today") return { period: make("today", today, today) };
  if (p === "30d") return { period: make("30d", addDays(today, -29), today) };
  if (p === "custom") {
    const from = typeof sp.from === "string" ? sp.from : "";
    const to = typeof sp.to === "string" ? sp.to : "";
    let problem: string | undefined;
    if (!isRealDay(from) || !isRealDay(to)) problem = "Pick both dates.";
    else if (from > to) problem = "The first date is after the last one.";
    else if (to > today) problem = "The last date is in the future.";
    else if (daysBetween(from, to) > MAX_DAYS) problem = `Pick ${MAX_DAYS} days or fewer.`;
    if (!problem) return { period: make("custom", from, to) };
    return { period: make("7d", addDays(today, -6), today), problem: `${problem} Showing the last 7 days.` };
  }
  return { period: make("7d", addDays(today, -6), today) };
}

/** The same number of days just before this period, for "compared with". */
export function previousPeriod(p: Period): Period {
  return make(p.key, addDays(p.from, -p.days), addDays(p.from, -1));
}

export function dayList(p: Period): string[] {
  return Array.from({ length: p.days }, (_, i) => addDays(p.from, i));
}

/** A round top for a value axis and its ticks: 0, step, 2·step… covering max. */
export function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

/** Change against the previous period, as a whole percent; null when there's nothing to compare. */
export function percentChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/* ── CSV ── */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  /* a text cell starting with = + - @ would run as a formula in Excel or Sheets */
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  /* the byte-order mark makes Excel read it as UTF-8 (names like "Café", the "×" sign) */
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
