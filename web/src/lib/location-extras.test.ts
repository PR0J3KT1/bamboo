import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROOMS, ExtrasSchema, fromRate, NO_EXTRAS, NO_ROOMS, RoomsSchema, roomsOffered } from "./location-extras";

test("the rooms a location offers, and its lowest rate", () => {
  assert.deepEqual(roomsOffered(DEFAULT_ROOMS), ["std", "dlx"]);
  assert.deepEqual(roomsOffered(NO_ROOMS), []);
  assert.equal(fromRate(DEFAULT_ROOMS), 3500); // the Deluxe is on request
  assert.equal(fromRate({ ...DEFAULT_ROOMS, std: { ...DEFAULT_ROOMS.std, offered: false } }), null);
  assert.equal(fromRate({ ...DEFAULT_ROOMS, dlx: { offered: true, rate: 3000, maxGuests: 2 } }), 3000);
});

test("rooms and cards are checked in plain words", () => {
  const r = RoomsSchema.safeParse({ ...DEFAULT_ROOMS, dlx: { offered: true, rate: 50, maxGuests: 2 } });
  assert.equal(r.success ? null : r.error.issues[0].message, "A room rate is at least KES 100, or blank for “on request”.");
  const blank = RoomsSchema.parse({ ...DEFAULT_ROOMS, nearby: "  " });
  assert.equal(blank.nearby, null);
  const e = ExtrasSchema.parse({ ...NO_EXTRAS, sports: { on: true, body: "" } });
  assert.deepEqual(e.sports, { on: true, body: null });
});
