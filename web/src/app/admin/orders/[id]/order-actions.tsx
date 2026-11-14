"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/dialog";
import { callRiderFor, moveOrder } from "../actions";

/* The main step for this order, and, for staff, "Call a rider". */
export function NextStep({ orderId, to, label, main }: { orderId: string; to: string; label: string; main: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant={main ? "main" : "action"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await moveOrder(orderId, to);
          if (!r.ok) return toast(r.error, "danger");
          toast(r.message);
          if (r.warning) toast(r.warning, "danger");
          router.refresh();
        })
      }
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function CallRider({ orderId, again }: { orderId: string; again: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await callRiderFor(orderId);
          toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
          router.refresh();
        })
      }
    >
      {pending ? "Calling…" : again ? "Call a rider again" : "Call a rider now"}
    </Button>
  );
}

export function CancelOrder({ orderId, code }: { orderId: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Cancel order</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {code}?</DialogTitle>
            <DialogDescription>The customer sees the reason on their tracking page. This can&rsquo;t be undone.</DialogDescription>
          </DialogHeader>
          <TextAreaField label="Why" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The customer asked to cancel" error={error} />
          <DialogFooter>
            <Button variant="quiet" onClick={() => setOpen(false)}>Keep the order</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await moveOrder(orderId, "cancelled", reason);
                  if (!r.ok) return setError(r.error);
                  setOpen(false);
                  toast(r.message);
                  if (r.warning) toast(r.warning, "danger");
                  router.refresh();
                })
              }
            >
              {pending ? "Cancelling…" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* Keep the page current while it's open. */
export function LiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useLiveOrder(orderId, "/api/admin/orders/stream", () => router.refresh());
  return null;
}

function useLiveOrder(orderId: string, url: string, onChange: () => void) {
  useEffect(() => {
    const es = new EventSource(url);
    es.addEventListener("order", (e) => (e as MessageEvent).data === orderId && onChange());
    return () => es.close();
  }, [orderId, url, onChange]);
}
