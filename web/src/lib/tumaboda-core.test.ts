import { test } from "node:test";
import assert from "node:assert/strict";
import { centsToKes, needsAttention, orderStatusFor, signForTest, verifySignature } from "./tumaboda-core";

const secret = "whsec_test";
const body = JSON.stringify({ id: "evt_1", event: "delivery.status_updated", data: { id: "d1", status: "in_transit" } });

test("a correct, fresh signature passes", () => {
  assert.equal(verifySignature(body, signForTest(body, secret, 1000), secret, 1010), true);
});

test("wrong secret, changed body, old or garbled signatures fail", () => {
  assert.equal(verifySignature(body, signForTest(body, "whsec_other", 1000), secret, 1000), false);
  assert.equal(verifySignature(body + " ", signForTest(body, secret, 1000), secret, 1000), false);
  assert.equal(verifySignature(body, signForTest(body, secret, 1000), secret, 1000 + 301), false);
  assert.equal(verifySignature(body, "t=1000,v1=abcd", secret, 1000), false); // short: no throw
  assert.equal(verifySignature(body, "nonsense", secret, 1000), false);
  assert.equal(verifySignature(body, null, secret, 1000), false);
  assert.equal(verifySignature(body, signForTest(body, secret, 1000), "", 1000), false);
});

test("rider statuses move the order only at pickup and drop-off", () => {
  assert.equal(orderStatusFor("accepted"), null);
  assert.equal(orderStatusFor("arrived_at_pickup"), null);
  assert.equal(orderStatusFor("in_transit"), "out_for_delivery");
  assert.equal(orderStatusFor("delivered"), "completed");
  assert.equal(needsAttention("cancelled"), true);
  assert.equal(needsAttention("in_transit"), false);
});

test("cents round up to the shilling", () => {
  assert.equal(centsToKes(15000), 150);
  assert.equal(centsToKes(15001), 151);
});

import { laterStatus } from "./tumaboda-core";
test("a late, older rider status doesn't overwrite a newer one", () => {
  assert.equal(laterStatus("delivered", "in_transit"), "delivered");
  assert.equal(laterStatus("accepted", "in_transit"), "in_transit");
  assert.equal(laterStatus(null, "pending"), "pending");
  assert.equal(laterStatus("in_transit", "cancelled"), "cancelled");
});
