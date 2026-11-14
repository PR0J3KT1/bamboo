"use client";
import { basket, useBasket } from "@/lib/basket";
import { cn } from "@/lib/utils";

/* Delivery or collect, in the header. Checkout starts from this choice and can still change it. */
export function ModeSwitch() {
  const { mode } = useBasket();
  const opt = (value: "delivery" | "collect", label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => basket.set({ mode: value })}
      className={cn("h-10 rounded-full px-[18px] font-semibold", mode === value ? "bg-on-grove text-grove" : "text-on-grove hover:bg-on-grove/10")}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="How you get your order" className="flex self-start rounded-full bg-on-grove/10 p-1">
      {opt("delivery", "Delivery")}
      {opt("collect", "Collect")}
    </div>
  );
}
