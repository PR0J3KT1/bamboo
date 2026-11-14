"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* A sheet on the native <dialog>: it rises from the bottom on a phone and slides in from the
   right from 768px up. Escape, the close button and a tap on the dimmed page all close it,
   focus is trapped while it is open, and the page behind doesn't scroll. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  media,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // the backdrop
      }}
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 flex max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl bg-panel p-0 text-ink shadow-lift backdrop:bg-scrim not-open:hidden",
        "animate-in slide-in-from-bottom duration-200",
        "md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-3xl md:slide-in-from-right md:slide-in-from-bottom-0",
        className,
      )}
    >
      <div className="relative">
        {media}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-full bg-panel/90 text-ink",
            !media && "bg-ground-2",
          )}
        >
          <X aria-hidden className="size-5" strokeWidth={2.4} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[18px] pt-[18px] pb-4">
        <h2 className={cn("font-display text-h2 font-extrabold uppercase", !media && "pr-12")}>{title}</h2>
        {children}
      </div>
      {footer && <div className="border-t border-line bg-panel px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </dialog>
  );
}
