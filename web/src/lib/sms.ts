import "server-only";

/* Text messages through Africa's Talking (https://developers.africastalking.com/docs/sms/sending).
   Without AT_API_KEY (local development) the message is printed to the server log instead. */

const SANDBOX = process.env.AT_USERNAME === "sandbox";
const ENDPOINT = SANDBOX
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) {
    if (process.env.NODE_ENV === "production") throw new Error("SMS is not configured (AT_API_KEY, AT_USERNAME)");
    console.info(`[sms:dev] to ${to}: ${message}`);
    return;
  }
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`SMS send failed: ${res.status}`);
  const json = (await res.json()) as {
    SMSMessageData?: { Recipients?: { status: string; statusCode: number }[] };
  };
  const r = json.SMSMessageData?.Recipients?.[0];
  if (!r || (r.statusCode !== 100 && r.statusCode !== 101 && r.statusCode !== 102)) {
    throw new Error(`SMS not accepted: ${r?.status ?? "no recipient"}`);
  }
}
