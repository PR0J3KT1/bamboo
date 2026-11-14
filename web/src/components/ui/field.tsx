"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border-[1.5px] border-line bg-card px-3.5 text-body text-ink placeholder:text-ink-3 transition-colors focus-visible:border-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/15 aria-invalid:border-danger";

type FieldProps = { label: ReactNode; hint?: ReactNode; error?: string | null };

function useFieldIds(error?: string | null, hint?: ReactNode) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return { id, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined };
}

function FieldFrame({ id, label, hint, hintId, error, errorId, children, className }: FieldProps & {
  id: string; hintId?: string; errorId?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[0.875rem] font-semibold">{label}</label>
      {children}
      {hint && <p id={hintId} className="text-fine text-ink-2">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-fine font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function TextField({ label, hint, error, className, ...props }: FieldProps & ComponentProps<"input">) {
  const ids = useFieldIds(error, hint);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error} className={className}>
      <input id={ids.id} aria-describedby={ids.describedBy} aria-invalid={error ? true : undefined} className={cn(control, "h-12")} {...props} />
    </FieldFrame>
  );
}

export function TextAreaField({ label, hint, error, className, rows = 3, ...props }: FieldProps & ComponentProps<"textarea">) {
  const ids = useFieldIds(error, hint);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error} className={className}>
      <textarea id={ids.id} rows={rows} aria-describedby={ids.describedBy} aria-invalid={error ? true : undefined} className={cn(control, "resize-none py-2.5")} {...props} />
    </FieldFrame>
  );
}
