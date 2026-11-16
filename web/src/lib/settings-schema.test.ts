import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, SettingsSchema, withDefaults } from "./settings-schema";

test("a new database gets the old site's facts", () => {
  assert.deepEqual(withDefaults(undefined), DEFAULTS);
  assert.deepEqual(withDefaults({ hours: "Open from noon" }).tables, DEFAULTS.tables);
  assert.equal("rooms" in withDefaults({ rooms: { dlx: { rate: 6000 } } }), false); // rooms belong to each location now
  assert.deepEqual(withDefaults({ hours: "" }), DEFAULTS); // a broken saved value falls back whole
});

test("saving checks every field in plain words", () => {
  const ok = SettingsSchema.safeParse({ ...DEFAULTS, phone: "0712 345 678", rating: { stars: 4.5, reviews: 1462 } });
  assert.ok(ok.success);
  if (ok.success) assert.equal(ok.data.phone, "+254712345678");
  const msg = (v: object) => {
    const r = SettingsSchema.safeParse({ ...DEFAULTS, ...v });
    return r.success ? null : `${r.error.issues[0].path.join(".")}: ${r.error.issues[0].message}`;
  };
  assert.equal(msg({ rating: { stars: 9, reviews: 10 } }), "rating.stars: Stars are between 1 and 5, like 4.5.");
  assert.equal(msg({ rating: { stars: Number.NaN, reviews: 10 } }), "rating.stars: Stars are a number between 1 and 5, like 4.5.");
  assert.equal(msg({ phone: "12" }), "phone: That isn't a Kenyan mobile number.");
  assert.equal(msg({ tables: { ...DEFAULTS.tables, from: "23:00", to: "12:00" } }), "tables.to: The first table has to be before the last.");
});
