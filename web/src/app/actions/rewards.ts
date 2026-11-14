"use server";
import { createHash, randomInt } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { earnsReward, game, type GameId } from "@/lib/games/core";
import { getSettings } from "@/lib/settings";

export type RewardResult = { ok: true; code: string; percent: number; expires: string } | { ok: false; error: string };

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const DAYS = 14;
const PER_DAY = 5; // codes one connection can win in a day

function newCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return `CHEZA-${c}`;
}

/** A winning solo score earns a one-off code for a share off the food. The score is the phone's
    word (games run in the browser), so the cap per connection keeps it a treat, not a tap. */
export async function claimReward(gameId: string, score: number): Promise<RewardResult> {
  const g = game(gameId);
  if (!g || !Number.isInteger(score) || score < 0 || score > 1000) return { ok: false, error: "That score didn't come through." };
  if (!earnsReward(g.id as GameId, score)) return { ok: false, error: "That score doesn't win the reward. Rudia tu!" };
  const { rewards } = await getSettings();
  if (!rewards.open) return { ok: false, error: "Game rewards are paused just now. The bragging rights are still yours." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32) : null;
  if (ipHash) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.rewardCodes)
      .where(and(eq(schema.rewardCodes.ipHash, ipHash), gt(schema.rewardCodes.createdAt, sql`now() - interval '1 day'`)));
    if (n >= PER_DAY) return { ok: false, error: `That's ${PER_DAY} codes today. Use one on an order first; there's more tomorrow.` };
  }
  const expires = new Date(Date.now() + DAYS * 86_400_000);
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    const r = await db.insert(schema.rewardCodes).values({ code, game: g.id, score, percent: rewards.percent, ipHash, expiresAt: expires }).onConflictDoNothing().returning({ code: schema.rewardCodes.code });
    if (r.length) return { ok: true, code, percent: rewards.percent, expires: expires.toISOString() };
  }
  return { ok: false, error: "The code didn't come through. Try once more." };
}

/** Check a code at checkout without using it: what it takes off. */
export async function checkReward(codeInput: string): Promise<{ ok: true; percent: number } | { ok: false; error: string }> {
  const code = String(codeInput ?? "").trim().toUpperCase().slice(0, 20);
  if (!/^CHEZA-[A-Z0-9]{6}$/.test(code)) return { ok: false, error: "That doesn't look like a game code, like CHEZA-7KQ2MX." };
  const [r] = await db.select().from(schema.rewardCodes).where(eq(schema.rewardCodes.code, code)).limit(1);
  if (!r) return { ok: false, error: "That code isn't one of ours." };
  if (r.usedAt) return { ok: false, error: "That code has been used on an order already." };
  if (r.expiresAt < new Date()) return { ok: false, error: "That code has expired. Win another!" };
  return { ok: true, percent: r.percent };
}
