import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrderStatus } from "@/lib/order-status";

/* The parts of the TumaBoda integration that need no network, kept apart so they can be tested.
   TumaBoda's partner API: docs-repo/partner-rest-api.md in the TumaBoda repos. */

/** Verify X-Tuma-Signature: "t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>".
    Rejects anything older or newer than `toleranceSec`, so a captured request can't be replayed. */
export function verifySignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(t) || !sig || !/^[0-9a-f]+$/i.test(sig)) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(sig.toLowerCase(), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b); // length first: timingSafeEqual throws otherwise
}

export function signForTest(rawBody: string, secret: string, t: number) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")}`;
}

/** Where a TumaBoda delivery status moves our order, if anywhere. Rider found, on the way to the
    lounge, at the lounge: the order stays "ready", with the rider's progress shown beside it. */
export function orderStatusFor(tumaStatus: string): OrderStatus | null {
  if (tumaStatus === "in_transit") return "out_for_delivery";
  if (tumaStatus === "delivered") return "completed";
  return null;
}

/** Statuses that need someone at the lounge to act: call another rider, or call the customer. */
export function needsAttention(tumaStatus: string | null | undefined) {
  return !!tumaStatus && ["cancelled", "failed", "returned", "returning_to_origin", "payment_failed"].includes(tumaStatus);
}

/** Whole shillings from cents, rounded up as TumaBoda does. */
export function centsToKes(cents: number) {
  return Math.ceil(cents / 100);
}

const RANK: Record<string, number> = {
  awaiting_payment: 0, payment_failed: 0, pending: 1, accepted: 2, heading_to_pickup: 3, arrived_at_pickup: 4,
  in_transit: 5, returning_to_origin: 6, delivered: 7, returned: 7, cancelled: 7, failed: 7,
};

/** Webhooks can arrive out of order (retries, slow networks). Keep the rider status that's
    furthest along; an unknown status is taken as it comes. */
export function laterStatus(current: string | null | undefined, incoming: string): string {
  if (!current) return incoming;
  const a = RANK[current], b = RANK[incoming];
  if (a === undefined || b === undefined) return incoming;
  return b >= a ? incoming : current;
}
