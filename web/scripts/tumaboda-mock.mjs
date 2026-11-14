/* A stand-in for TumaBoda's partner API, for trying deliveries on your own machine without a key.
   It answers the calls the app makes (cash-on-delivery quote, create, look up by reference) in the
   same shapes as the real API, then walks each delivery through the sandbox's statuses, sending a
   signed webhook for each step, like the real sandbox does.

   usage:
     pnpm tumaboda:mock          (listens on http://localhost:4010)
   and run the app with:
     TUMABODA_API_KEY=tuma_test_mock
     TUMABODA_BASE_URL=http://localhost:4010/api/v1/partner
     TUMABODA_WEBHOOK_SECRET=whsec_mock
   Options: MOCK_PORT, MOCK_WEBHOOK_URL (default http://localhost:3000/api/tumaboda/webhook),
   MOCK_STEP_MS (default 4000), MOCK_FAIL=wallet (every create fails with a low balance). */
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const WEBHOOK_URL = process.env.MOCK_WEBHOOK_URL ?? "http://localhost:3000/api/tumaboda/webhook";
const SECRET = process.env.TUMABODA_WEBHOOK_SECRET ?? "whsec_mock";
const STEP_MS = Number(process.env.MOCK_STEP_MS ?? 4000);
const LOUNGE = [-1.27, 36.82];
const STEPS = ["accepted", "heading_to_pickup", "arrived_at_pickup", "in_transit", "delivered"];

const byRef = new Map();
let seq = 5000;

function km(lat, lng) {
  const r = Math.PI / 180, dLat = (lat - LOUNGE[0]) * r, dLng = (lng - LOUNGE[1]) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(LOUNGE[0] * r) * Math.cos(lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a)) * 1.35;
}
const fareCents = (d) => Math.round(Math.max(150, 100 + d * 40)) * 100; // a made-up fare, not TumaBoda's

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function webhook(delivery, status) {
  delivery.status = status;
  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    event: status === "delivered" ? "delivery.delivered" : "delivery.status_updated",
    createdAt: new Date().toISOString(),
    data: { id: delivery.id, deliveryNumber: delivery.deliveryNumber, status, riderId: "rider_mock", updatedAt: new Date().toISOString() },
  });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
  try {
    const r = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Tuma-Signature": `t=${t},v1=${sig}`, "X-Tuma-Event": "delivery.status_updated" }, body });
    console.log(`[mock] ${delivery.reference} → ${status}: webhook ${r.status}`);
  } catch (e) {
    console.log(`[mock] ${delivery.reference} → ${status}: webhook failed (${e.message})`);
  }
}

function walk(delivery) {
  STEPS.forEach((s, i) => setTimeout(() => webhook(delivery, s), STEP_MS * (i + 1)));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api\/v1\/partner/, "");
  if (!req.headers["x-api-key"] && !req.headers.authorization) return send(res, 401, { error: { code: "UNAUTHORIZED", message: "API key required" } });
  let body = {};
  if (req.method === "POST") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try { body = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return send(res, 400, { error: { code: "BAD_REQUEST", message: "Bad JSON" } }); }
  }

  if (req.method === "POST" && path === "/deliveries/pod/quote") {
    const d = km(Number(body.dropoff?.latitude), Number(body.dropoff?.longitude));
    const goods = Math.round(parseFloat(body.pod?.goodsValueKes) * 100);
    if (!Number.isFinite(d) || !(goods > 0)) return send(res, 400, { error: { code: "BAD_REQUEST", message: "dropoff and pod.goodsValueKes are required" } });
    const fare = fareCents(d);
    console.log(`[mock] quote ${d.toFixed(1)} km → fare KES ${fare / 100}`);
    return send(res, 200, { quote: { goods_value_cents: goods, delivery_fee_payer: "customer", base_total_cost_cents: fare, pod_fee_cents: 0, total_cost_cents: fare, collect_at_door_cents: goods + fare, required_hold_cents: fare, estimated_distance_km: d, estimated_duration_minutes: Math.round(d * 4) } });
  }

  if (req.method === "POST" && path === "/deliveries/pod") {
    if (process.env.MOCK_FAIL === "wallet") return send(res, 402, { error: { code: "INSUFFICIENT_BALANCE", message: "Wallet balance too low" } });
    if (!body.reference || !body.recipient?.phone || !body.package?.description) return send(res, 400, { error: { code: "BAD_REQUEST", message: "reference, recipient and package.description are required" } });
    const existing = byRef.get(body.reference);
    if (existing) return send(res, 409, { error: { code: "DUPLICATE_REFERENCE", message: "A delivery already exists for that reference", reference: body.reference, deliveryId: existing.id } });
    const delivery = { id: randomUUID(), deliveryNumber: `TB-${++seq}`, reference: body.reference, status: "pending", trackingCode: randomUUID().slice(0, 8), recipient: body.recipient, package: body.package, pod: body.pod };
    delivery.trackingUrl = `http://localhost:${PORT}/track/${delivery.trackingCode}`;
    byRef.set(body.reference, delivery);
    console.log(`[mock] created ${delivery.deliveryNumber} for ${body.reference}: ${body.recipient.name}, ${body.recipient.location}; collect KES ${body.pod?.goodsValueKes} + fare${body.package.notes ? `; note: ${body.package.notes}` : ""}`);
    walk(delivery);
    return send(res, 201, { delivery });
  }

  if (req.method === "GET" && path === "/deliveries/by-reference") {
    const d = byRef.get(url.searchParams.get("reference"));
    return d ? send(res, 200, { delivery: d }) : send(res, 404, { error: { code: "NOT_FOUND", message: "No delivery for that reference" } });
  }

  send(res, 404, { error: { code: "NOT_FOUND", message: `No route ${req.method} ${path}` } });
}).listen(PORT, () => console.log(`[mock] TumaBoda partner API on http://localhost:${PORT}/api/v1/partner, webhooks to ${WEBHOOK_URL}`));
