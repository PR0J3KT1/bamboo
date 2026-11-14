import type { AgeStatus } from "@/db/queries/customers";

export const AGE: Record<AgeStatus, { label: string; tone: "ok" | "danger" | "neutral" }> = {
  adult: { label: "Open, 18+", tone: "ok" },
  minor: { label: "Closed, under 18", tone: "danger" },
  unfinished: { label: "Account not finished", tone: "neutral" },
  guest: { label: "Guest", tone: "neutral" },
};

