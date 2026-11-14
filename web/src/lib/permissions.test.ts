import { test } from "node:test";
import assert from "node:assert/strict";
import { can } from "./permissions";

test("customers have no admin access", () => {
  assert.equal(can("customer", { order: ["view"] }), false);
  assert.equal(can(null, { order: ["view"] }), false);
  assert.equal(can("someone-made-up", { order: ["view"] }), false);
});

test("staff run orders and the sold-out switch, nothing more", () => {
  assert.equal(can("staff", { order: ["view", "update"] }), true);
  assert.equal(can("staff", { menu: ["toggle"] }), true);
  assert.equal(can("staff", { customer: ["view"] }), true);
  assert.equal(can("staff", { menu: ["edit"] }), false);
  assert.equal(can("staff", { report: ["view"] }), false);
  assert.equal(can("staff", { user: ["set-role"] }), false);
  assert.equal(can("staff", { user: ["ban"] }), false);
});

test("admins do everything except impersonate", () => {
  for (const p of [{ menu: ["edit" as const] }, { report: ["view" as const] }, { user: ["set-role" as const, "ban" as const] }]) {
    assert.equal(can("admin", p), true);
  }
  assert.equal(can("admin", { user: ["impersonate"] }), false);
});
