import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* A small status label: "Open, 18+", "Sold out", "18+: check ID at handover". */
const tagStyles = cva("inline-flex h-7 items-center gap-1 rounded-full px-3 text-fine font-bold", {
  variants: {
    tone: {
      neutral: "bg-ground-2 text-ink-2",
      ok: "bg-action-soft text-action",
      warn: "bg-warn-soft text-warn-ink",
      danger: "bg-danger-soft text-danger-ink",
      grove: "bg-grove text-on-grove",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Tag({ tone, className, ...props }: ComponentProps<"span"> & VariantProps<typeof tagStyles>) {
  return <span className={cn(tagStyles({ tone }), className)} {...props} />;
}

/* A choice that toggles: a size, a section filter, a period. */
export function ChoicePill({
  selected,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold transition-colors",
        selected ? "bg-action text-on-action" : "border-[1.5px] border-line bg-panel text-ink hover:border-action",
        className,
      )}
      {...props}
    />
  );
}
