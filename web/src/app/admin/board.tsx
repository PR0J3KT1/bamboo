"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import type { Ticket } from "@/db/queries/orders";
import { ageTone, COLUMNS, nextAction, PAYMENT_LABEL, TUMABODA_STATUS } from "@/lib/order-status";
import { needsAttention } from "@/lib/tumaboda-core";
import { formatKes } from "@/components/ui/price";
import { Tag } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { moveOrder } from "./orders/actions";

const CHIME_KEY = "bc-admin-chime";

/* A short two-note chime for a new order, made in the browser (no sound file). */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch {
    /* no audio: the ticket still appears */
  }
}

/* Live: the server tells us when any order changes, and we re-read the board. If the stream
   drops, EventSource reconnects; a slow re-read every 30 s covers anything missed meanwhile. */
function useLiveBoard() {
  const router = useRouter();
  const [live, setLive] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 250);
    };
    const es = new EventSource("/api/admin/orders/stream");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener("order", refresh);
    const slow = setInterval(() => router.refresh(), 30_000);
    return () => {
      es.close();
      clearInterval(slow);
      clearTimeout(t);
    };
  }, [router]);
  return live;
}

export function Board({ tickets, serverNow, doneToday, cancelledToday }: { tickets: Ticket[]; serverNow: number; doneToday: number; cancelledToday: number }) {
  const live = useLiveBoard();
  const [now, setNow] = useState(serverNow);
  const [sound, setSound] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHIME_KEY) === "on") Promise.resolve().then(() => setSound(true));
    } catch {}
  }, []);

  /* chime once for each new order that arrives while the board is open */
  useEffect(() => {
    const ids = tickets.filter((t) => t.status === "received").map((t) => t.id);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seen.current!.has(id));
    fresh.forEach((id) => seen.current!.add(id));
    if (fresh.length && sound) chime();
  }, [tickets, sound]);

  const open = tickets.length;
  return (
    <main className="flex flex-1 flex-col gap-0 px-4 pt-3 pb-6 md:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-h3 font-extrabold uppercase">Service</h1>
        <span className="text-ink-2">
          {open} open, {doneToday} done today{cancelledToday ? `, ${cancelledToday} cancelled` : ""}
        </span>
        <span className={cn("flex items-center gap-1.5 text-fine", live ? "text-action" : "text-warn-ink")}>
          <span aria-hidden className={cn("size-2 rounded-full", live ? "bg-action" : "bg-warn")} />
          {live ? "Live" : "Reconnecting…"}
        </span>
        <button
          type="button"
          aria-pressed={sound}
          onClick={() => {
            const next = !sound;
            setSound(next);
            try {
              localStorage.setItem(CHIME_KEY, next ? "on" : "off");
            } catch {}
            if (next) chime(); // a tap unlocks sound in the browser; play it once so staff hear it works
          }}
          className="ml-auto flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line bg-panel px-3.5 text-[0.875rem] font-semibold"
        >
          {sound ? <Volume2 aria-hidden className="size-4" /> : <VolumeX aria-hidden className="size-4" />}
          {sound ? "Chime on" : "Chime off"}
        </button>
      </div>

      <div aria-hidden className="rail-bg h-3 rounded-md shadow-[0_3px_6px_rgb(20_41_28/.25)]" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] items-start gap-[18px]">
        {COLUMNS.map((c) => {
          const list = tickets.filter((t) => t.status === c.status || (c.status === "received" && t.status === "awaiting_payment"));
          return (
            <section key={c.status} aria-label={c.name} className="flex flex-col gap-3.5">
              <h2 className="mt-2.5 mb-0.5 flex items-baseline justify-between font-bold">
                {c.name} <span className="figures text-[1.375rem]">{list.length}</span>
              </h2>
              {list.map((t) => (
                <TicketCard key={t.id} t={t} now={now} />
              ))}
              {list.length === 0 && <p className="text-fine text-ink-3">None</p>}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function TicketCard({ t, now }: { t: Ticket; now: number }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const minutes = Math.max(0, Math.floor((now - Date.parse(t.createdAt)) / 60_000));
  const tone = ageTone(minutes);
  const action = nextAction(t.mode, t.status);
  /* with a rider booked, TumaBoda moves the order on; staff can still do it by hand */
  const riderLeads = t.status === "ready" && t.mode === "delivery" && t.riderBooked && !needsAttention(t.tumabodaStatus);

  return (
    <article className="relative flex flex-col gap-2 rounded-t-[3px] rounded-b-xl bg-card px-3.5 pt-5 pb-3.5 shadow-[0_1px_0_var(--line),0_8px_18px_rgb(20_41_28/.12)]">
      <span
        aria-hidden
        className={cn("absolute -top-[9px] left-1/2 -ml-[26px] h-4 w-[52px] rounded", tone === "late" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-action")}
      />
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/admin/orders/${t.id}`} className="figures text-[1.625rem] text-ink after:absolute after:inset-0 after:content-['']">
          {t.code}
        </Link>
        <span className={cn("font-bold", tone === "late" ? "text-danger-ink" : tone === "warn" ? "text-warn-ink" : "text-action")}>
          {minutes} min<span className="sr-only">{tone === "late" ? ", late" : tone === "warn" ? ", getting late" : ""}</span>
        </span>
      </div>
      <span className="text-[0.875rem] font-semibold text-ink-2">
        {t.mode === "delivery" ? `Delivery to ${t.place}` : "Collect at the counter"}, {t.customerName}
      </span>
      <ul className="flex flex-col gap-1 border-y border-dashed border-line py-2">
        {t.lines.map((l, i) => (
          <li key={i} className="leading-snug">
            <b>{l.qty}</b> {l.name}
            {l.option ? `, ${l.option.toLowerCase()}` : ""}
          </li>
        ))}
      </ul>
      {t.note && <p className="rounded-lg bg-warn-soft px-2.5 py-1.5 text-fine">{t.note}</p>}
      <div className="flex flex-wrap gap-1.5 empty:hidden">
        {t.hasAlcohol && <Tag tone="danger">18+: check ID at handover</Tag>}
        {t.status === "awaiting_payment" && <Tag tone="warn">Waiting for payment</Tag>}
        {t.tumabodaStatus && (
          <Tag tone={needsAttention(t.tumabodaStatus) ? "danger" : "ok"}>{TUMABODA_STATUS[t.tumabodaStatus] ?? t.tumabodaStatus}</Tag>
        )}
        {t.tumabodaError && <Tag tone="danger">Rider not booked</Tag>}
      </div>
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="flex flex-col leading-tight">
          <span className="figures text-[1.25rem]">KES {formatKes(t.total)}</span>
          <span className="text-fine text-ink-2">{PAYMENT_LABEL[t.paymentMethod]}</span>
        </span>
        {action && !riderLeads && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await moveOrder(t.id, action.to);
                if (!r.ok) return toast(r.error, "danger");
                toast(r.message);
                if (r.warning) toast(r.warning, "danger");
              })
            }
            className={cn(
              "h-11 rounded-full px-4 font-semibold disabled:opacity-60",
              t.status === "received" ? "bg-lime font-bold text-on-lime" : "bg-action text-on-action",
            )}
          >
            {pending ? "…" : action.label}
          </button>
        )}
      </div>
    </article>
  );
}
