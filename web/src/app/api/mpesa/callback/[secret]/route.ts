import { timingSafeEqual } from "node:crypto";
import { parseCallback } from "@/lib/mpesa-core";
import { settlePayment } from "@/lib/payments";

/* Daraja posts each STK result here. The secret in the address is how we know it's Daraja (its
   callbacks aren't signed); even then, a "paid" is confirmed with Daraja before it counts. Always
   answers "accepted", so Daraja doesn't keep retrying something we can't use. */
export async function POST(req: Request, ctx: RouteContext<"/api/mpesa/callback/[secret]">) {
  const { secret } = await ctx.params;
  const want = process.env.MPESA_CALLBACK_SECRET ?? "";
  const ok = want.length > 0 && secret.length === want.length && timingSafeEqual(Buffer.from(secret), Buffer.from(want));
  if (!ok) return new Response("Not found", { status: 404 });
  const r = parseCallback(await req.json().catch(() => null));
  if (r) {
    try {
      await settlePayment(r.checkoutRequestId, r);
    } catch (e) {
      console.error("mpesa callback", e);
    }
  }
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
