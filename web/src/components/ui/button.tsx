import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Buttons are pills. Lime ("main") is for the ONE main action on a screen; "action" (culm green)
   for every other; "danger" only for cancelling. Use buttonStyles() to style a Link the same way. */
export const buttonStyles = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,transform] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        main: "bg-lime font-bold text-on-lime hover:bg-[color-mix(in_oklab,var(--lime),black_6%)]",
        action: "bg-action text-on-action hover:bg-[color-mix(in_oklab,var(--action),black_12%)]",
        outline: "border-[1.5px] border-action text-action hover:bg-action-soft",
        danger: "border-[1.5px] border-danger text-danger hover:bg-danger-soft",
        quiet: "text-ink hover:bg-ground-2",
        grove: "border-[1.5px] border-on-grove/40 text-on-grove hover:bg-on-grove/10",
      },
      size: {
        sm: "h-11 px-4 text-[0.875rem]",
        md: "h-12 px-5 text-body",
        lg: "h-14 px-6 text-[1.0625rem]",
        icon: "size-11",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "action", size: "md" },
  },
);

export type ButtonStyleProps = VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, block, type = "button", ...props }: ComponentProps<"button"> & ButtonStyleProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size, block }), className)} {...props} />;
}
