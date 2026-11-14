"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* Quantity: − n +. `label` names what is counted, for screen readers ("Chips"). */
export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 99,
  size = "md",
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const btn = size === "sm" ? "size-8" : "size-10";
  return (
    <div
      role="group"
      aria-label={`Quantity of ${label}`}
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-line bg-card p-[3px]", className)}
    >
      <button
        type="button"
        aria-label={value - 1 < min ? `Remove ${label}` : `One less ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(btn, "flex items-center justify-center rounded-full bg-ground-2 text-ink disabled:opacity-40")}
      >
        <Minus aria-hidden className="size-4" strokeWidth={2.6} />
      </button>
      <output aria-live="polite" className={cn("figures min-w-7 text-center", size === "sm" ? "text-[1.0625rem]" : "text-[1.375rem]")}>
        {value}
      </output>
      <button
        type="button"
        aria-label={`One more ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(btn, "flex items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40")}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}
