/* A stand-in for Safaricom's Daraja (M-Pesa Express), for trying payments on your own machine
   without keys. It answers the calls the app makes (token, STK push, STK query) in Daraja's shapes,
   then, after a few seconds, posts the result to the callback address like Daraja does.

   usage:
     pnpm mpesa:mock            (listens on http://localhost:4011)
   and run the app with:
     MPESA_BASE_URL=http://localhost:4011  MPESA_CONSUMER_KEY=mock  MPESA_CONSUMER_SECRET=mock
     MPESA_SHORTCODE=174379  MPESA_PASSKEY=mock  MPESA_CALLBACK_SECRET=mocksecret12345
   How a prompt ends depends on the phone number's last digit: 1 the customer cancels (1032), 7 it
   times out (1037), anything else it's paid. MOCK_NO_CALLBACK=1 never calls back (to try the query
   fallback). MOCK_STEP_MS sets the delay (default 3000). */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 4011);
const STEP_MS = Number(process.env.MOCK_STEP_MS ?? 3000);
const prompts = new Map(); // CheckoutRequestID -> { amount, phone, done, code, desc, receipt }

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const read = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b ? JSON.parse(b) : {})); });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/oauth/v1/generate") return json(res, 200, { access_token: "mock_" + randomBytes(6).toString("hex"), expires_in: "3599" });
  if (!(req.headers.authorization ?? "").startsWith("Bearer ")) return json(res, 401, { errorMessage: "Invalid Access Token" });
  const body = await read(req);

  if (url.pathname === "/mpesa/stkpush/v1/processrequest") {
    if (!body.Amount || !body.PhoneNumber || !body.CallBackURL) return json(res, 400, { errorMessage: "Bad Request - Invalid fields" });
    const id = `ws_CO_${Date.now()}${randomBytes(3).toString("hex")}`;
    const last = String(body.PhoneNumber).slice(-1);
    const p = { amount: body.Amount, phone: body.PhoneNumber, done: false, code: last === "1" ? 1032 : last === "7" ? 1037 : 0 };
    p.desc = p.code === 1032 ? "Request cancelled by user" : p.code === 1037 ? "DS timeout user cannot be reached" : "The service request is processed successfully.";
    p.receipt = p.code === 0 ? "T" + randomBytes(5).toString("hex").toUpperCase().slice(0, 9) : null;
    prompts.set(id, p);
    console.log(`[mpesa-mock] prompt ${id}: KES ${body.Amount} to ${body.PhoneNumber}, will end with ${p.code}`);
    setTimeout(async () => {
      p.done = true;
      if (process.env.MOCK_NO_CALLBACK) return console.log(`[mpesa-mock] ${id} ended; no callback (MOCK_NO_CALLBACK)`);
      const cb = { Body: { stkCallback: { MerchantRequestID: "mock-1", CheckoutRequestID: id, ResultCode: p.code, ResultDesc: p.desc,
        ...(p.code === 0 ? { CallbackMetadata: { Item: [{ Name: "Amount", Value: p.amount }, { Name: "MpesaReceiptNumber", Value: p.receipt }, { Name: "TransactionDate", Value: 20261115120000 }, { Name: "PhoneNumber", Value: Number(p.phone) }] } } : {}) } } };
      try {
        const r = await fetch(body.CallBackURL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cb) });
        console.log(`[mpesa-mock] callback for ${id}: ${r.status}`);
      } catch (e) {
        console.log(`[mpesa-mock] callback for ${id} failed: ${e.message}`);
      }
    }, STEP_MS);
    return json(res, 200, { MerchantRequestID: "mock-1", CheckoutRequestID: id, ResponseCode: "0", ResponseDescription: "Success. Request accepted for processing", CustomerMessage: "Success. Request accepted for processing" });
  }

  if (url.pathname === "/mpesa/stkpushquery/v1/query") {
    const p = prompts.get(body.CheckoutRequestID);
    if (!p) return json(res, 404, { errorMessage: "No such request" });
    if (!p.done) return json(res, 500, { errorCode: "500.001.1001", errorMessage: "The transaction is being processed" });
    return json(res, 200, { ResponseCode: "0", CheckoutRequestID: body.CheckoutRequestID, ResultCode: String(p.code), ResultDesc: p.desc });
  }
  json(res, 404, { errorMessage: "Not found" });
}).listen(PORT, () => console.log(`[mpesa-mock] Daraja stand-in on http://localhost:${PORT}`));
