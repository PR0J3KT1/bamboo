"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyBooking } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";

/* Cancel asks once more first, so a stray tap doesn't drop the booking. */
export function CancelBooking({ id }: { id: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!sure) {
    return (
      <Button variant="quiet" className="self-start text-danger-ink underline" onClick={() => setSure(true)}>
        Cancel this booking
      </Button>
    );
  }
  return (
    <div role="group" aria-label="Cancel the booking" className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger-soft p-4">
      <p>Cancel this booking? The lounge sees that it&rsquo;s cancelled.</p>
      {error && <p role="alert" className="font-semibold text-danger-ink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelMyBooking(id);
              if (!r.ok) return setError(r.error ?? "It couldn't be cancelled. Call the lounge.");
              router.refresh();
            })
          }
        >
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </Button>
        <Button variant="quiet" onClick={() => setSure(false)}>Keep it</Button>
      </div>
    </div>
  );
}
