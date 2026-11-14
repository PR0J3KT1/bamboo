"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { blockNumber, unblockNumber } from "../actions";

export function BlockForm({ phone, blocked }: { phone: string; blocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (blocked) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await unblockNumber(phone);
            toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
            router.refresh();
          })
        }
      >
        {pending ? "Unblocking…" : "Unblock this number"}
      </Button>
    );
  }
  if (!open) return <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Block this number</Button>;
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await blockNumber(phone, reason);
          if (!r.ok) return setError(r.error);
          toast(r.message);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <TextField label="Why" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Two orders not collected, phone off" error={error} />
      <p className="text-fine text-ink-2">They&rsquo;re signed out, and can&rsquo;t sign in or order online until unblocked.</p>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>{pending ? "Blocking…" : "Block this number"}</Button>
        <Button variant="quiet" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
