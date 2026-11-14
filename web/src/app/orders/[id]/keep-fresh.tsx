"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Until live updates arrive with the orders board (phase 4), re-read the order every 15 seconds
   while it's still moving, and whenever the customer comes back to the tab. */
export function KeepFresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 15_000);
    const onShow = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [active, router]);
  return null;
}
