import { cn } from "@/lib/utils";

export function formatKes(n: number) {
  return Math.round(n).toLocaleString("en-KE");
}

const SIZES = { sm: "text-[1.1875rem]", md: "text-[1.375rem]", lg: "text-[1.75rem]", xl: "text-h2" } as const;

/* "KES" small and quiet, then the number in Big Shoulders with lined-up figures. */
export function Price({
  amount,
  from = false,
  size = "md",
  className,
}: {
  amount: number;
  from?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <small className="text-[0.6875rem] font-bold opacity-75">{from ? "from KES" : "KES"}</small>
      <span className={cn("figures leading-none", SIZES[size])}>{formatKes(amount)}</span>
    </span>
  );
}
