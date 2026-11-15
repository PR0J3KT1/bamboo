import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { notifyOrder } from "@/lib/order-feed";
import { failureText } from "@/lib/mpesa-core";
import { MpesaError, mpesaEnabled, stkPush, stkQuery } from "@/lib/mpesa";

/* Paying an order by M-Pesa. The order waits as "awaiting_payment" (the kitchen doesn't start it)
   until Daraja says it's paid; then it becomes "received" like any other. Daraja's callbacks
   aren't signed, so a "paid" is only believed after asking Daraja ourselves (stkQuery). */

/** Send the PIN prompt for an order's total to its phone. */
export async function requestPayment(orderId: string, origin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mpesaEnabled()) return { ok: false, error: "M-Pesa isn't set up yet. Pay on delivery or at the counter." };
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: "That order no longer exists." };
  if (o.paymentStatus === "paid") return { ok: true };
  if (o.status !== "awaiting_payment") return { ok: false, error: "This order isn't waiting for a payment." };
  try {
    const r = await stkPush({ amount: o.total, phone: o.phone, reference: o.code, origin });
    await db.update(schema.orders).set({ mpesaCheckoutRequestId: r.checkoutRequestId, paymentStatus: "pending", paymentError: null }).where(eq(schema.orders.id, o.id));
    await notifyOrder(db, o.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof MpesaError ? `M-Pesa didn't send the prompt: ${e.message}` : "M-Pesa couldn't be reached. Try again, or pay on delivery.";
    await db.update(schema.orders).set({ paymentStatus: "failed", paymentError: msg }).where(eq(schema.orders.id, o.id));
    await notifyOrder(db, o.id);
    return { ok: false, error: msg };
  }
}

/** A prompt has ended: confirm it with Daraja, then mark the order paid (and send it to the
    kitchen) or failed (and say why). Safe to call twice for the same prompt. */
export async function settlePayment(checkoutRequestId: string, said: { paid: boolean; resultCode: number; resultDesc: string; receipt: string | null }) {
  /* believe a "paid" only once Daraja confirms it */
  let result = said;
  if (said.paid) {
    const q = await stkQuery(checkoutRequestId);
    if (!q.done) return { settled: false as const };
    result = { ...said, paid: q.resultCode === 0, resultCode: q.resultCode, resultDesc: q.resultDesc };
  }
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.mpesaCheckoutRequestId, checkoutRequestId)).for("update").limit(1);
    if (!o) return { settled: false as const };
    if (o.paymentStatus === "paid") return { settled: true as const, orderId: o.id };
    if (result.paid) {
      const toKitchen = o.status === "awaiting_payment";
      await tx
        .update(schema.orders)
        .set({ paymentStatus: "paid", mpesaReceipt: result.receipt, paymentError: null, status: toKitchen ? "received" : o.status })
        .where(eq(schema.orders.id, o.id));
      if (toKitchen) await tx.insert(schema.orderEvents).values({ orderId: o.id, status: "received", byName: "M-Pesa", note: result.receipt ? `Paid, receipt ${result.receipt}` : "Paid" });
    } else {
      await tx.update(schema.orders).set({ paymentStatus: "failed", paymentError: failureText(result.resultCode, result.resultDesc) }).where(eq(schema.orders.id, o.id));
    }
    await notifyOrder(tx, o.id);
    return { settled: true as const, orderId: o.id };
  });
}

/** For the tracking page: a prompt still pending after a while gets asked about, in case the
    callback never came. */
export async function checkPending(o: { id: string; paymentStatus: string; mpesaCheckoutRequestId: string | null; updatedAt: Date }) {
  if (!mpesaEnabled() || o.paymentStatus !== "pending" || !o.mpesaCheckoutRequestId) return;
  if (Date.now() - o.updatedAt.getTime() < 20_000) return;
  try {
    const q = await stkQuery(o.mpesaCheckoutRequestId);
    if (q.done) await settlePayment(o.mpesaCheckoutRequestId, { paid: q.resultCode === 0, resultCode: q.resultCode, resultDesc: q.resultDesc, receipt: null });
  } catch {
    /* Daraja unreachable: the next refresh tries again */
  }
}

/** The customer gives up on M-Pesa: pay the rider, or at the counter, instead. */
export async function switchToCash(orderId: string) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "awaiting_payment"))).for("update").limit(1);
    if (!o) return false;
    await tx
      .update(schema.orders)
      .set({ paymentMethod: o.mode === "delivery" ? "pay_on_delivery" : "pay_at_counter", paymentStatus: "unpaid", paymentError: null, status: "received" })
      .where(eq(schema.orders.id, o.id));
    await tx.insert(schema.orderEvents).values({ orderId: o.id, status: "received", byName: "Customer", note: "Changed to paying in cash or M-Pesa on the spot" });
    await notifyOrder(tx, o.id);
    return true;
  });
}
