"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* Short confirmations that repeat the action's verb: "Added to your order", "Marked ready".
   Read out by screen readers (polite), gone after 4 seconds. */
type Tone = "ok" | "danger";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const show = useCallback((message: string, tone: Tone = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex max-w-md animate-in items-center gap-2 rounded-full px-5 py-3 text-body font-semibold shadow-lift fade-in slide-in-from-bottom-2",
              t.tone === "ok" ? "bg-grove text-on-grove" : "bg-danger text-white",
            )}
          >
            {t.tone === "ok" ? <Check aria-hidden className="size-4 text-lime" /> : <CircleAlert aria-hidden className="size-4" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
