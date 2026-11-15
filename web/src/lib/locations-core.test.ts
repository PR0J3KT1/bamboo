import { test } from "node:test";
import assert from "node:assert/strict";
import { kmBetween, nearest, roadKm } from "./locations-core";

const ngara = { id: "ngara", lat: -1.2738, lng: 36.8245 };
const karen = { id: "karen", lat: -1.3197, lng: 36.7076 };
const westlands = { lat: -1.2676, lng: 36.8108 };
const galleria = { lat: -1.3399, lng: 36.7676 };

test("distance between two Nairobi points", () => {
  const d = kmBetween(ngara, karen);
  assert.ok(d > 13 && d < 14.5, `got ${d}`);
  assert.equal(kmBetween(ngara, ngara), 0);
});

test("road distance is longer than the straight line", () => {
  assert.ok(roadKm(ngara, westlands) > kmBetween(ngara, westlands));
});

test("the nearest location takes the delivery", () => {
  assert.equal(nearest([ngara, karen], westlands)?.id, "ngara");
  assert.equal(nearest([ngara, karen], galleria)?.id, "karen");
  assert.equal(nearest([], westlands), null);
});

test("a tie goes to the first location", () => {
  const twin = { ...ngara, id: "twin" };
  assert.equal(nearest([ngara, twin], westlands)?.id, "ngara");
});
