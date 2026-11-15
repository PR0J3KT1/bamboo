"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payAgain, payInCashInstead } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";

/* While an order waits for M-Pesa: send the prompt again, or pay in cash on the spot instead. */
export function PayActions({ id, failed, cash }: { id: string; failed: boolean; cash: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (f: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) setError(r.error ?? "That didn't work. Try again.");
      router.refresh();
    });
  return (
    <section aria-label="Payment" className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
      <p>{failed ? "Send the prompt again, or pay on the spot instead." : "No prompt? Check the number, then send it again."}</p>
      {error && <p role="alert" className="font-semibold text-danger-ink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant={failed ? "main" : "outline"} disabled={pending} onClick={() => run(() => payAgain(id))}>{pending ? "Sending…" : "Send the M-Pesa prompt again"}</Button>
        <Button variant="quiet" disabled={pending} onClick={() => run(() => payInCashInstead(id))}>{cash}</Button>
      </div>
    </section>
  );
}
