"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Re-read the order whenever the lounge or the rider moves it (a live stream from the server),
   when the customer comes back to the tab, and once a minute in case the stream dropped. */
export function KeepFresh({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const es = new EventSource(`/api/orders/${id}/stream`);
    es.addEventListener("order", () => router.refresh());
    const slow = setInterval(() => router.refresh(), 60_000);
    const onShow = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      es.close();
      clearInterval(slow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [id, active, router]);
  return null;
}
