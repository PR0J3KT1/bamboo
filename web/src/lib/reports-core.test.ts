import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, csvCell, dayList, niceScale, parsePeriod, percentChange, previousPeriod, toCsv, MAX_DAYS } from "./reports-core";

const TODAY = "2026-11-14";

test("preset periods end today, in Nairobi days", () => {
  const t = parsePeriod({ p: "today" }, TODAY).period;
  assert.equal(t.from, TODAY);
  assert.equal(t.days, 1);
  assert.equal(t.start.toISOString(), "2026-11-13T21:00:00.000Z"); // midnight in Nairobi
  assert.equal(t.end.toISOString(), "2026-11-14T21:00:00.000Z");
  const w = parsePeriod({}, TODAY).period;
  assert.deepEqual([w.key, w.from, w.to, w.days], ["7d", "2026-11-08", TODAY, 7]);
  const m = parsePeriod({ p: "30d" }, TODAY).period;
  assert.deepEqual([m.from, m.days], ["2026-10-16", 30]);
});

test("custom periods are checked", () => {
  assert.equal(parsePeriod({ p: "custom", from: "2026-11-01", to: "2026-11-10" }, TODAY).period.days, 10);
  for (const [from, to] of [["2026-11-10", "2026-11-01"], ["2026-11-01", "2026-11-15"], ["2026-02-30", "2026-03-01"], ["x", "y"], ["2026-01-01", "2026-11-14"]]) {
    const r = parsePeriod({ p: "custom", from, to }, TODAY);
    assert.ok(r.problem, `${from}..${to} should be refused`);
    assert.equal(r.period.key, "7d");
  }
  assert.equal(parsePeriod({ p: "custom", from: addDays(TODAY, -(MAX_DAYS - 1)), to: TODAY }, TODAY).problem, undefined);
});

test("the previous period is the same length, just before", () => {
  const p = previousPeriod(parsePeriod({ p: "custom", from: "2026-03-01", to: "2026-03-03" }, TODAY).period);
  assert.deepEqual([p.from, p.to, p.days], ["2026-02-26", "2026-02-28", 3]);
  assert.deepEqual(dayList(p), ["2026-02-26", "2026-02-27", "2026-02-28"]);
});

test("axis tops are round and cover the max", () => {
  assert.deepEqual(niceScale(0), { top: 4, step: 1 });
  assert.deepEqual(niceScale(8700), { top: 10000, step: 2500 });
  assert.deepEqual(niceScale(184300), { top: 200000, step: 50000 });
  for (const n of [1, 7, 99, 1234, 55555]) assert.ok(niceScale(n).top >= n);
});

test("percent change", () => {
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(50, 0), null);
  assert.equal(percentChange(0, 80), -100);
});

test("CSV cells are quoted and can't run as formulas", () => {
  assert.equal(csvCell('Nyama, "choma"'), '"Nyama, ""choma"""');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell(-150), "-150"); // numbers stay numbers
  assert.equal(csvCell(null), "");
  assert.ok(toCsv(["a"], [[1]]).startsWith("﻿a\r\n1"));
});
