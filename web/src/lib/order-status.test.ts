import { test } from "node:test";
import assert from "node:assert/strict";
import { ageTone, canMove, nextAction } from "./order-status";

test("delivery: accept, ready, hand to rider, delivered", () => {
  assert.deepEqual(nextAction("delivery", "received"), { to: "preparing", label: "Accept" });
  assert.deepEqual(nextAction("delivery", "preparing"), { to: "ready", label: "Mark ready" });
  assert.deepEqual(nextAction("delivery", "ready"), { to: "out_for_delivery", label: "Hand to rider" });
  assert.deepEqual(nextAction("delivery", "out_for_delivery"), { to: "completed", label: "Delivered" });
  assert.equal(nextAction("delivery", "completed"), null);
});

test("collect skips the rider", () => {
  assert.deepEqual(nextAction("collect", "ready"), { to: "completed", label: "Collected" });
  assert.equal(canMove("collect", "ready", "out_for_delivery"), false);
});

test("only one step forward, never back or skipping", () => {
  assert.equal(canMove("delivery", "received", "preparing"), true);
  assert.equal(canMove("delivery", "received", "ready"), false);
  assert.equal(canMove("delivery", "ready", "preparing"), false);
  assert.equal(canMove("delivery", "completed", "received"), false);
});

test("cancel only while open; payment moves awaiting_payment, not staff", () => {
  assert.equal(canMove("delivery", "preparing", "cancelled"), true);
  assert.equal(canMove("delivery", "completed", "cancelled"), false);
  assert.equal(canMove("delivery", "cancelled", "cancelled"), false);
  assert.equal(canMove("delivery", "awaiting_payment", "received"), false);
  assert.equal(nextAction("delivery", "awaiting_payment"), null);
});

test("ticket age: amber at 15, ember at 30", () => {
  assert.equal(ageTone(14), "fresh");
  assert.equal(ageTone(15), "warn");
  assert.equal(ageTone(30), "late");
});
