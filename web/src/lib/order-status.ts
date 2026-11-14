/* The steps an order goes through, in customer words. Shared by tracking and the admin. */
export type OrderStatus = "awaiting_payment" | "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export function stepsFor(mode: "delivery" | "collect"): { status: OrderStatus; label: string; headline: string }[] {
  return mode === "delivery"
    ? [
        { status: "received", label: "Order received", headline: "Order received" },
        { status: "preparing", label: "In the kitchen", headline: "In the kitchen" },
        { status: "ready", label: "Packed and ready", headline: "Packed and ready" },
        { status: "out_for_delivery", label: "With the rider", headline: "On the way" },
        { status: "completed", label: "Delivered", headline: "Delivered. Enjoy." },
      ]
    : [
        { status: "received", label: "Order received", headline: "Order received" },
        { status: "preparing", label: "In the kitchen", headline: "In the kitchen" },
        { status: "ready", label: "Ready at the counter", headline: "Ready to collect" },
        { status: "completed", label: "Collected", headline: "Collected. Enjoy." },
      ];
}

export const PAYMENT_LABEL = {
  mpesa: "M-Pesa",
  pay_on_delivery: "Pay the rider",
  pay_at_counter: "Pay at the counter",
} as const;
