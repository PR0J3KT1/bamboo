import { test } from "node:test";
import assert from "node:assert/strict";
import { beiPoints, CHORA, deal, DECKS, earnsReward, GAMES, guessPoints, memoryScore, outOf100, pourAccuracy, QUIZ, SETUP, turnOrder, winners, WYR } from "./core";

test("the content came across from the old site", () => {
  assert.equal(GAMES.length, 13);
  assert.equal(Object.values(QUIZ).reduce((s, q) => s + q.length, 0), 465);
  for (const qs of Object.values(QUIZ)) for (const q of qs) assert.ok(q[1].length === 4 && q[2] >= 0 && q[2] < 4, q[0]);
  assert.equal(CHORA.length, 75);
  assert.equal(WYR.length, 48);
  assert.ok(Object.keys(DECKS).length >= 5);
  for (const g of GAMES) assert.ok(SETUP[g.id], g.id);
});

test("dealing skips what's been seen, and starts over when the pool runs out", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const one = deal(pool, 3, (x) => x, []);
  assert.equal(one.hand.length, 3);
  const two = deal(pool, 2, (x) => x, one.seen);
  assert.deepEqual(new Set([...one.hand, ...two.hand]).size, 5);
  const three = deal(pool, 3, (x) => x, two.seen); // only none left unseen: a fresh start
  assert.equal(three.hand.length, 3);
  assert.equal(three.seen.length, 3);
});

test("dealing with topics takes turns across them", () => {
  const pool = ["h1", "h2", "h3", "g1", "g2", "g3"];
  const { hand } = deal(pool, 4, (x) => x, [], (x) => x[0]);
  assert.deepEqual(hand.map((x) => x[0]).sort(), ["g", "g", "h", "h"]);
});

test("teams take turns, players in order", () => {
  const order = turnOrder([
    { name: "Simba", players: ["Wanjiku", "Otieno"], colour: "" },
    { name: "Chui", players: ["Achieng'"], colour: "" },
  ]);
  assert.deepEqual(order, [{ team: 0, player: "Wanjiku" }, { team: 1, player: "Achieng'" }, { team: 0, player: "Otieno" }, { team: 1, player: "Achieng'" }]);
  assert.deepEqual(turnOrder(null), [{ team: 0, player: "You" }]);
  assert.deepEqual(winners([3, 5, 5]), [1, 2]);
});

test("each game scores as it did", () => {
  assert.equal(guessPoints(true, 0, 10), 10);
  assert.equal(guessPoints(true, 10, 10), 5);
  assert.equal(guessPoints(false, 1, 10), 0);
  assert.equal(outOf100(56, 8), 70);
  assert.deepEqual([beiPoints(1000, 1000), beiPoints(1090, 1000), beiPoints(1150, 1000), beiPoints(1300, 1000), beiPoints(2000, 1000)], [10, 8, 5, 2, 0]);
  assert.deepEqual(pourAccuracy(50, 50), { spilt: false, acc: 100 });
  assert.deepEqual(pourAccuracy(60, 50), { spilt: false, acc: 80 });
  assert.deepEqual(pourAccuracy(200, 150), { spilt: true, acc: 0 });
  assert.equal(memoryScore(6), 100);
  assert.equal(memoryScore(11), 70);
  assert.equal(memoryScore(30), 0);
});

test("the reward goes to a solo score over the line, on rewarded games only", () => {
  assert.ok(earnsReward("history", 8));
  assert.ok(!earnsReward("history", 7));
  assert.ok(earnsReward("memory", 70));
  assert.ok(!earnsReward("headsup", 99)); // party games are for fun
});
