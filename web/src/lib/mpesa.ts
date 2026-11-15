import "server-only";
import { darajaPassword, darajaTimestamp, msisdn } from "@/lib/mpesa-core";

/* M-Pesa Express (STK push) through Safaricom's Daraja API. Set up with:
     MPESA_ENV             sandbox (default) or production
     MPESA_CONSUMER_KEY    MPESA_CONSUMER_SECRET    the Daraja app's keys
     MPESA_SHORTCODE       the paybill, or the till's head-office number
     MPESA_TILL            the till number, for a Buy Goods till (leave empty for a paybill)
     MPESA_PASSKEY         the Lipa na M-Pesa passkey
     MPESA_CALLBACK_SECRET a long random string; it's in the callback address so only Daraja knows it
     MPESA_BASE_URL        optional, to point at the local mock (scripts/mpesa-mock.mjs)
   Without the keys, M-Pesa isn't offered at checkout. */

const BASE = process.env.MPESA_BASE_URL || (process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

export function mpesaEnabled() {
  return !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_SECRET);
}

export class MpesaError extends Error {}

let token: { value: string; until: number } | null = null;
async function accessToken() {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const basic = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` }, cache: "no-store" });
  if (!res.ok) throw new MpesaError(`M-Pesa sign-in failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: string | number };
  token = { value: j.access_token, until: Date.now() + Number(j.expires_in) * 1000 };
  return token.value;
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await res.json().catch(() => ({}))) as T & { errorMessage?: string };
  if (!res.ok) throw new MpesaError(j.errorMessage || `M-Pesa refused the request (${res.status})`);
  return j;
}

function credentials() {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const timestamp = darajaTimestamp();
  return { BusinessShortCode: shortcode, Password: darajaPassword(shortcode, process.env.MPESA_PASSKEY!, timestamp), Timestamp: timestamp };
}

/** The address Daraja calls back with the result; the secret in it is how we know it's Daraja. */
export function callbackUrl(origin: string) {
  return `${origin}/api/mpesa/callback/${process.env.MPESA_CALLBACK_SECRET}`;
}

/** Send the PIN prompt to the customer's phone. */
export async function stkPush(p: { amount: number; phone: string; reference: string; origin: string }) {
  const till = process.env.MPESA_TILL;
  const r = await post<{ CheckoutRequestID?: string; ResponseCode?: string; ResponseDescription?: string; CustomerMessage?: string }>("/mpesa/stkpush/v1/processrequest", {
    ...credentials(),
    TransactionType: till ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    Amount: Math.round(p.amount),
    PartyA: msisdn(p.phone),
    PartyB: till || process.env.MPESA_SHORTCODE,
    PhoneNumber: msisdn(p.phone),
    CallBackURL: callbackUrl(p.origin),
    AccountReference: p.reference.slice(0, 12),
    TransactionDesc: `Bamboo Cask ${p.reference}`.slice(0, 13),
  });
  if (r.ResponseCode !== "0" || !r.CheckoutRequestID) throw new MpesaError(r.ResponseDescription || "M-Pesa didn't take the request.");
  return { checkoutRequestId: r.CheckoutRequestID };
}

/** Ask Daraja how a prompt ended: the check behind every "paid" (callbacks aren't signed). */
export async function stkQuery(checkoutRequestId: string): Promise<{ done: boolean; resultCode: number; resultDesc: string }> {
  try {
    const r = await post<{ ResultCode?: string; ResultDesc?: string; errorCode?: string }>("/mpesa/stkpushquery/v1/query", { ...credentials(), CheckoutRequestID: checkoutRequestId });
    if (r.ResultCode === undefined) return { done: false, resultCode: -1, resultDesc: "" };
    return { done: true, resultCode: Number(r.ResultCode), resultDesc: r.ResultDesc ?? "" };
  } catch (e) {
    /* "The transaction is being processed" comes back as an error while the customer is still on the prompt */
    if (e instanceof MpesaError && /being processed/i.test(e.message)) return { done: false, resultCode: -1, resultDesc: "" };
    throw e;
  }
}
