"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { BookingStatus } from "@/lib/bookings";
import { moveBooking } from "../actions";

/* What staff can do with a booking. One reply box serves confirm and decline: it goes in the SMS
   ("Check-in from 2pm", "We're full for the derby, can you do 9pm?"). Declining needs one. */
export function BookingActions({ id, code, status, kind }: { id: string; code: string; status: BookingStatus; kind: "room" | "table" }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function go(to: "confirmed" | "declined" | "cancelled" | "completed") {
    setError(null);
    start(async () => {
      const r = await moveBooking(id, to, reply);
      if (!r.ok) return setError(r.error);
      toast(r.message);
      if (r.warning) toast(r.warning, "danger");
      setReply("");
      router.refresh();
    });
  }

  if (status !== "requested" && status !== "confirmed") {
    return <aside className="self-start rounded-2xl border border-line bg-panel p-4 text-ink-2">{code} is closed. Nothing more to do.</aside>;
  }
  return (
    <aside aria-label="Answer" className="flex flex-col gap-3 self-start rounded-2xl border border-line bg-panel p-4 md:sticky md:top-4">
      {status === "requested" ? (
        <>
          <h2 className="font-display text-[1.5rem] font-extrabold uppercase">Answer</h2>
          <TextAreaField
            label="Message for the customer"
            hint="Goes in the SMS. Needed to decline."
            rows={3}
            maxLength={300}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={kind === "room" ? "Check-in from 2pm. Pay at reception." : "Your table is by the big screen."}
          />
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
          <Button variant="main" size="lg" disabled={pending} onClick={() => go("confirmed")}>{pending ? "Saving…" : "Confirm and text them"}</Button>
          <Button variant="danger" disabled={pending} onClick={() => go("declined")}>Decline and text them</Button>
        </>
      ) : (
        <>
          <h2 className="font-display text-[1.5rem] font-extrabold uppercase">Confirmed</h2>
          <p className="text-ink-2">When they&rsquo;ve {kind === "room" ? "checked out" : "been"}, mark it done. If they cancel by phone, cancel it here.</p>
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
          <Button variant="action" disabled={pending} onClick={() => go("completed")}>{pending ? "Saving…" : "Mark done"}</Button>
          <Button variant="outline" disabled={pending} onClick={() => go("cancelled")}>Cancel the booking</Button>
        </>
      )}
    </aside>
  );
}
