import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingSms, bookingSummary, canMoveBooking, checkRoom, checkTable, tableWhen } from "./bookings";

const TODAY = "2026-11-14";
const terms = { std: { offered: true, rate: 3500, maxGuests: 2 }, dlx: { offered: true, rate: null, maxGuests: 3 } };
const tables = { open: true, from: "12:00", to: "23:00", maxPeople: 30 };

test("a room request is checked", () => {
  const ok = checkRoom({ room: "std", checkIn: "2026-11-20", nights: 2, guests: 2 }, TODAY, terms);
  assert.deepEqual(ok, { ok: true, data: { room: "std", checkIn: "2026-11-20", nights: 2, guests: 2, rate: 3500 } });
  assert.equal(checkRoom({ room: "dlx", checkIn: TODAY, nights: 1, guests: 3 }, TODAY, terms).ok, true);
  for (const bad of [
    { room: "suite", checkIn: "2026-11-20", nights: 1, guests: 1 },
    { room: "std", checkIn: "2026-11-13", nights: 1, guests: 1 },
    { room: "std", checkIn: "2026-02-30", nights: 1, guests: 1 },
    { room: "std", checkIn: "2028-01-01", nights: 1, guests: 1 },
    { room: "std", checkIn: "2026-11-20", nights: 0, guests: 1 },
    { room: "std", checkIn: "2026-11-20", nights: 31, guests: 1 },
    { room: "std", checkIn: "2026-11-20", nights: 1, guests: 3 },
    { room: "std", checkIn: "2026-11-20", nights: 1.5, guests: 1 },
  ]) assert.equal(checkRoom(bad, TODAY, terms).ok, false, JSON.stringify(bad));
  const noDeluxe = { ...terms, dlx: { ...terms.dlx, offered: false } };
  assert.equal(checkRoom({ room: "dlx", checkIn: TODAY, nights: 1, guests: 1 }, TODAY, noDeluxe).ok, false);
});

test("a table request is checked against the hours and the clock", () => {
  const ok = checkTable({ date: "2026-11-15", time: "19:30", people: 4, occasion: "Match day" }, TODAY, "10:00", tables);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.at.toISOString(), "2026-11-15T16:30:00.000Z");
    assert.equal(ok.data.occasion, "Match day");
  }
  assert.equal(checkTable({ date: TODAY, time: "18:00", people: 2, occasion: "Something odd" }, TODAY, "17:00", tables).ok, true);
  const bad = [
    { date: TODAY, time: "17:10", people: 2, occasion: null }, // less than 30 minutes away
    { date: "2026-11-15", time: "11:00", people: 2, occasion: null }, // before opening
    { date: "2026-11-15", time: "23:30", people: 2, occasion: null }, // after the last table
    { date: "2026-11-15", time: "19:00", people: 31, occasion: null },
    { date: "2027-02-01", time: "19:00", people: 2, occasion: null }, // more than 60 days
    { date: "2026-11-13", time: "19:00", people: 2, occasion: null },
  ];
  for (const b of bad) assert.equal(checkTable(b, TODAY, "17:00", tables).ok, false, JSON.stringify(b));
  assert.equal(checkTable({ date: "2026-11-15", time: "19:00", people: 2, occasion: null }, TODAY, "10:00", { ...tables, open: false }).ok, false);
});

test("bookings move only forward", () => {
  assert.ok(canMoveBooking("requested", "confirmed"));
  assert.ok(canMoveBooking("confirmed", "completed"));
  assert.ok(!canMoveBooking("declined", "confirmed"));
  assert.ok(!canMoveBooking("completed", "cancelled"));
  assert.ok(!canMoveBooking("requested", "completed"));
});

test("what the customer is told", () => {
  const room = { code: "BK-1001", kind: "room" as const, room: "std", checkIn: "2026-11-14", nights: 2, guests: 2, at: null };
  assert.equal(bookingSummary(room), "Standard room, Sat, 14 Nov to Mon, 16 Nov (2 nights), 2 guests");
  assert.equal(
    bookingSms(room, "confirmed", "Check-in from 2pm.", "0754 346 559"),
    "Bamboo Cask: your room BK-1001 is confirmed. Standard room, Sat, 14 Nov to Mon, 16 Nov (2 nights), 2 guests. Check-in from 2pm. Questions? 0754 346 559",
  );
  const table = { code: "BK-1002", kind: "table" as const, room: null, checkIn: null, nights: null, guests: 4, at: new Date("2026-11-15T16:30:00Z") };
  assert.equal(tableWhen(table.at), "Sun, 15 Nov at 19:30");
  assert.match(bookingSms(table, "declined", "We're full for the derby.", "0754 346 559"), /^Bamboo Cask: sorry, we can't take your table BK-1002\. We're full for the derby\./);
});
