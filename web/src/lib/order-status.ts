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

/* ───────── For the admin: what can happen next ───────── */

export type Mode = "delivery" | "collect";

const FORWARD: Record<Mode, Partial<Record<OrderStatus, OrderStatus>>> = {
  delivery: { awaiting_payment: "received", received: "preparing", preparing: "ready", ready: "out_for_delivery", out_for_delivery: "completed" },
  collect: { awaiting_payment: "received", received: "preparing", preparing: "ready", ready: "completed" },
};

const ACTION: Partial<Record<OrderStatus, string>> = {
  received: "Accept",
  preparing: "Mark ready",
};

/** The one main action on a ticket: the label and where it takes the order. */
export function nextAction(mode: Mode, status: OrderStatus): { to: OrderStatus; label: string } | null {
  const to = FORWARD[mode][status];
  if (!to) return null;
  if (status === "awaiting_payment") return null; // only the payment moves it on
  if (status === "ready") return { to, label: mode === "delivery" ? "Hand to rider" : "Collected" };
  if (status === "out_for_delivery") return { to, label: "Delivered" };
  return { to, label: ACTION[status]! };
}

export const OPEN: OrderStatus[] = ["awaiting_payment", "received", "preparing", "ready", "out_for_delivery"];

/** May staff move an order from one status to another? Only one step forward, or cancel while open. */
export function canMove(mode: Mode, from: OrderStatus, to: OrderStatus): boolean {
  if (to === "cancelled") return OPEN.includes(from);
  return FORWARD[mode][from] === to && from !== "awaiting_payment";
}

/** Board columns, in order. */
export const COLUMNS: { status: OrderStatus; name: string }[] = [
  { status: "received", name: "New" },
  { status: "preparing", name: "Preparing" },
  { status: "ready", name: "Ready" },
  { status: "out_for_delivery", name: "With the rider" },
];

/** Minutes an order has been waiting, and how loudly to show it. */
export function ageTone(minutes: number): "fresh" | "warn" | "late" {
  return minutes >= 30 ? "late" : minutes >= 15 ? "warn" : "fresh";
}

export const TUMABODA_STATUS: Record<string, string> = {
  pending: "Looking for a rider",
  accepted: "Rider found",
  heading_to_pickup: "Rider on the way to the lounge",
  arrived_at_pickup: "Rider at the lounge",
  in_transit: "Rider on the way to the customer",
  delivered: "Delivered",
  cancelled: "Rider cancelled",
  failed: "Delivery failed",
  returned: "Brought back to the lounge",
  returning_to_origin: "Rider bringing it back",
  awaiting_payment: "Waiting for TumaBoda payment",
  payment_failed: "TumaBoda payment failed",
};
