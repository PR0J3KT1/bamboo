"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Re-read the order whenever the lounge or the rider moves it (a live stream from the server),
   when the customer comes back to the tab, and once a minute in case the stream dropped. */
export function KeepFresh({ id, active, fast = false }: { id: string; active: boolean; fast?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const es = new EventSource(`/api/orders/${id}/stream`);
    es.addEventListener("order", () => router.refresh());
    /* while an M-Pesa prompt is out, every 15 seconds: each refresh asks Daraja if the callback is late */
    const slow = setInterval(() => router.refresh(), fast ? 15_000 : 60_000);
    const onShow = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      es.close();
      clearInterval(slow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [id, active, fast, router]);
  return null;
}
