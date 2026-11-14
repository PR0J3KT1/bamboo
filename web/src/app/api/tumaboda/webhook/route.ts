import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { notifyOrder } from "@/lib/order-feed";
import { canMove } from "@/lib/order-status";
import { laterStatus, orderStatusFor, verifySignature } from "@/lib/tumaboda-core";

/* TumaBoda tells us where the rider is. Register this address in the TumaBoda business app
   (Settings › Webhooks) and put the whsec_… secret it shows once in TUMABODA_WEBHOOK_SECRET.

   - The signature is checked against the raw body before anything else.
   - Each event id is handled once: TumaBoda retries, so the same event can arrive again.
   - An unknown delivery answers 404, so TumaBoda retries it (the rider may have been booked a
     moment before our database saved the delivery id).
   - The rider's progress is stored on the order; picking up moves it to "with the rider",
     dropping off completes it. Nothing here ever moves an order backwards. */

type Envelope = { id?: string; event?: string; data?: { id?: string; status?: string } };

export async function POST(req: Request) {
  const secret = process.env.TUMABODA_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-tuma-signature"), secret)) return new Response("Bad signature", { status: 401 });

  let env: Envelope;
  try {
    env = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const eventId = env.id ?? req.headers.get("x-tuma-webhook-id");
  const deliveryId = env.data?.id;
  const tumaStatus = env.data?.status;
  if (!eventId) return new Response("No event id", { status: 400 });
  if (!env.event?.startsWith("delivery.") || !deliveryId || !tumaStatus) return Response.json({ ok: true, ignored: true });

  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.tumabodaDeliveryId, deliveryId)).for("update").limit(1);
    if (!o) return "unknown" as const;
    const fresh = await tx.insert(schema.tumabodaEvents).values({ id: eventId }).onConflictDoNothing().returning({ id: schema.tumabodaEvents.id });
    if (!fresh.length) return "duplicate" as const;

    const target = orderStatusFor(tumaStatus);
    /* walk forward step by step (ready → with the rider → delivered), never back */
    const path = target === "completed" ? (["out_for_delivery", "completed"] as const) : target ? [target] : [];
    let status = o.status;
    for (const step of path) {
      if (canMove(o.mode, status, step)) {
        await tx.insert(schema.orderEvents).values({ orderId: o.id, status: step, byName: "TumaBoda" });
        status = step;
      }
    }
    await tx.update(schema.orders).set({ tumabodaStatus: laterStatus(o.tumabodaStatus, tumaStatus), status }).where(eq(schema.orders.id, o.id));
    if (status !== o.status) await audit(tx, null, "order.status", { type: "order", id: o.id }, { status: o.status }, { status, via: "tumaboda", tumaStatus });
    await notifyOrder(tx, o.id);
    return "ok" as const;
  });

  if (result === "unknown") return new Response("Unknown delivery", { status: 404 });
  return Response.json({ ok: true, duplicate: result === "duplicate" });
}
