/* M-Pesa (Safaricom Daraja, STK push) without the network: the timestamp and password Daraja asks
   for, the phone format it takes, and reading the callback it sends. Tested in mpesa-core.test.ts;
   src/lib/mpesa.ts makes the calls. Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate */

/** yyyyMMddHHmmss in Nairobi, as Daraja wants it. */
export function darajaTimestamp(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}${p.hour === "24" ? "00" : p.hour}${p.minute}${p.second}`;
}

/** base64(shortcode + passkey + timestamp). */
export const darajaPassword = (shortcode: string, passkey: string, timestamp: string) => Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

/** +254712345678 → 254712345678 */
export const msisdn = (e164: string) => e164.replace(/^\+/, "");

export type StkResult = {
  checkoutRequestId: string;
  paid: boolean;
  resultCode: number;
  resultDesc: string;
  receipt: string | null;
  amount: number | null;
  phone: string | null;
};

/** Read Daraja's callback body. Null when it isn't one. */
export function parseCallback(body: unknown): StkResult | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items = ((cb.CallbackMetadata as { Item?: { Name: string; Value?: string | number }[] } | undefined)?.Item ?? []) as { Name: string; Value?: string | number }[];
  const get = (n: string) => items.find((i) => i.Name === n)?.Value;
  const code = Number(cb.ResultCode);
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    paid: code === 0,
    resultCode: code,
    resultDesc: String(cb.ResultDesc ?? ""),
    receipt: get("MpesaReceiptNumber") != null ? String(get("MpesaReceiptNumber")) : null,
    amount: get("Amount") != null ? Number(get("Amount")) : null,
    phone: get("PhoneNumber") != null ? String(get("PhoneNumber")) : null,
  };
}

/** What a customer reads when a payment didn't go through, by Daraja's result code. */
export function failureText(code: number, desc: string) {
  if (code === 1032) return "You cancelled the M-Pesa prompt.";
  if (code === 1037) return "The M-Pesa prompt timed out before the PIN was entered.";
  if (code === 1) return "There wasn't enough in the M-Pesa account.";
  if (code === 2001) return "The M-Pesa PIN was wrong.";
  return desc ? `M-Pesa said: ${desc}` : "The M-Pesa payment didn't go through.";
}
