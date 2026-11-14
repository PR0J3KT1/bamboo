import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, bookingMessage, dayName, ROOMS, xl } from "./rooms";

const std = ROOMS.find((r) => r.id === "std")!;
const dlx = ROOMS.find((r) => r.id === "dlx")!;

test("stay dates roll over months and years", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 2), "2027-01-02");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(dayName("2026-11-14"), "Sat, 14 Nov");
});

test("the booking message carries the stay and the total, or asks for the rate", () => {
  const m = bookingMessage(std, "2026-11-14", 3, 2);
  assert.match(m, /Standard room: check in Sat, 14 Nov, check out Tue, 17 Nov \(3 nights\), 2 guests/);
  assert.match(m, /KES 10,500 at KES 3,500 a night/);
  assert.match(bookingMessage(dlx, "2026-11-14", 1, 1), /What is the Deluxe rate/);
});

test("full-screen copies keep the photo's orientation", () => {
  assert.deepEqual(xl(std.photos[0]), { src: "/rooms/std-1-xl.webp", width: 1600, height: 1200 });
  assert.equal(xl(std.photos[1]).height, 1600);
});
