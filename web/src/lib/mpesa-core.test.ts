import { test } from "node:test";
import assert from "node:assert/strict";
import { darajaPassword, darajaTimestamp, failureText, msisdn, parseCallback } from "./mpesa-core";

test("Daraja's timestamp is Nairobi time, and the password is the documented base64", () => {
  assert.equal(darajaTimestamp(new Date("2026-11-14T19:05:09Z")), "20261114220509");
  assert.equal(darajaTimestamp(new Date("2026-12-31T21:30:00Z")), "20270101003000");
  // the sandbox example: shortcode 174379 with its published passkey
  const pk = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  assert.equal(darajaPassword("174379", pk, "20160216165627"), Buffer.from(`174379${pk}20160216165627`).toString("base64"));
  assert.equal(msisdn("+254712345678"), "254712345678");
});

test("a paid callback", () => {
  const r = parseCallback({
    Body: { stkCallback: { MerchantRequestID: "29115-34620561-1", CheckoutRequestID: "ws_CO_191220191020363925", ResultCode: 0, ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: { Item: [{ Name: "Amount", Value: 730 }, { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" }, { Name: "TransactionDate", Value: 20191219102115 }, { Name: "PhoneNumber", Value: 254708374149 }] } } },
  });
  assert.deepEqual(r, { checkoutRequestId: "ws_CO_191220191020363925", paid: true, resultCode: 0, resultDesc: "The service request is processed successfully.", receipt: "NLJ7RT61SV", amount: 730, phone: "254708374149" });
});

test("a cancelled callback, and things that aren't callbacks", () => {
  const r = parseCallback({ Body: { stkCallback: { CheckoutRequestID: "ws_CO_1", ResultCode: 1032, ResultDesc: "Request cancelled by user" } } });
  assert.equal(r?.paid, false);
  assert.equal(r?.receipt, null);
  assert.equal(failureText(1032, "Request cancelled by user"), "You cancelled the M-Pesa prompt.");
  assert.equal(failureText(9999, "Odd"), "M-Pesa said: Odd");
  assert.equal(parseCallback({}), null);
  assert.equal(parseCallback("nope"), null);
});
