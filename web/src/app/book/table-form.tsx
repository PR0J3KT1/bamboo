"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { requestTable } from "@/app/actions/bookings";
import { OCCASIONS } from "@/lib/bookings";
import { addDays, dayName } from "@/lib/rooms";
import { todayInNairobi } from "@/lib/age";
import { useSession } from "@/lib/auth-client";
import { displayPhone } from "@/lib/phone";
import { whatsapp } from "@/lib/lounge";
import { rememberBooking } from "@/lib/basket";
import { WhatsAppIcon } from "@/components/brand";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
function nowHHMM() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

/** Half-hour slots from the first table to the last; today, only those at least half an hour away. */
export function slots(from: string, to: string, isToday: boolean, now: string) {
  const out: string[] = [];
  for (let m = minutes(from); m <= minutes(to); m += 30) if (!isToday || m >= minutes(now) + 30) out.push(hhmm(m));
  return out;
}

export function TableForm({ tables, phone, locationId }: { tables: { open: boolean; from: string; to: string; maxPeople: number }; phone: string; locationId: string }) {
  const router = useRouter();
  const today = useSyncExternalStore(noop, () => todayInNairobi(), () => "");
  const now = useSyncExternalStore(noop, nowHHMM, () => "00:00");
  const session = useSession();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [people, setPeople] = useState(2);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [tel, setTel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const u = session.data?.user as { name?: string; phoneNumber?: string | null; dateOfBirth?: string | null } | undefined;
  const nameValue = name ?? (u?.dateOfBirth ? (u.name ?? "") : "");
  const telValue = tel ?? (u?.phoneNumber ? displayPhone(u.phoneNumber) : "");
  const day = date && today && date >= today ? date : today;
  const times = day ? slots(tables.from, tables.to, day === today, now) : [];
  const chosen = times.includes(time) ? time : "";

  if (!tables.open) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-3xl border border-line bg-panel p-6">
        <h2 className="font-display text-h2 font-extrabold uppercase">Booking by phone for now</h2>
        <p>Tables aren&rsquo;t being booked online just now. Call or WhatsApp the lounge and they&rsquo;ll hold one for you.</p>
        <div className="flex flex-wrap gap-3">
          <a href={whatsapp(phone, "Hello Bamboo Cask, I'd like to book a table for ")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1fa855] px-5 font-bold text-white"><WhatsAppIcon className="size-5" /> WhatsApp</a>
          <a href={`tel:${phone}`} className="inline-flex h-12 items-center rounded-full border-[1.5px] border-action px-5 font-semibold text-action">Call {displayPhone(phone)}</a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!chosen) return setError("Pick a time.");
        start(async () => {
          const r = await requestTable({ locationId, date: day, time: chosen, people, occasion, name: nameValue, phone: telValue, note: note || null });
          if (!r.ok) return setError(r.error);
          rememberBooking(r.id, r.code);
          router.push(`/bookings/${r.id}`);
        });
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[1.75rem] leading-none font-extrabold uppercase">When</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Day">
            {today &&
              [0, 1, 2, 3, 4, 5, 6].map((n) => {
                const d = addDays(today, n);
                return (
                  <button key={d} type="button" aria-pressed={d === day} onClick={() => setDate(d)} className={cn("flex h-14 min-w-[76px] flex-col items-center justify-center rounded-2xl border-[1.5px] px-3 font-semibold", d === day ? "border-action bg-action text-on-action" : "border-line bg-card hover:border-action")}>
                    <span className="text-fine">{n === 0 ? "Today" : n === 1 ? "Tomorrow" : dayName(d).split(",")[0]}</span>
                    <span>{dayName(d).split(", ")[1]}</span>
                  </button>
                );
              })}
            <label className="flex h-14 items-center gap-2 rounded-2xl border-[1.5px] border-line bg-card px-3 font-semibold">
              <span className="text-fine">Another day</span>
              <input type="date" min={today || undefined} max={today ? addDays(today, 60) : undefined} value={day} onChange={(e) => setDate(e.target.value)} className="bg-transparent" />
            </label>
          </div>
          {times.length ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Time">
              {times.map((t) => (
                <button key={t} type="button" aria-pressed={t === chosen} onClick={() => setTime(t)} className={cn("h-11 min-w-[72px] rounded-full border-[1.5px] px-3 font-semibold tabular-nums", t === chosen ? "border-action bg-action text-on-action" : "border-line bg-card hover:border-action")}>
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-ink-2">No more tables can be booked online today. Pick another day, or call the lounge.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[1.75rem] leading-none font-extrabold uppercase">How many</h2>
          <div className="flex items-center gap-3">
            <div role="group" aria-label="People" className="flex items-center gap-2 rounded-full border border-line bg-card p-1">
              <button type="button" aria-label="One person fewer" disabled={people <= 1} onClick={() => setPeople(people - 1)} className="flex size-11 items-center justify-center rounded-full bg-ground-2 disabled:opacity-40"><Minus aria-hidden className="size-4" /></button>
              <span className="figures w-10 text-center text-[1.5rem]" aria-live="polite">{people}</span>
              <button type="button" aria-label="One more person" disabled={people >= tables.maxPeople} onClick={() => setPeople(people + 1)} className="flex size-11 items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40"><Plus aria-hidden className="size-4" /></button>
            </div>
            <span className="text-ink-2">{people === 1 ? "person" : "people"}</span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Occasion">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" aria-pressed={o === occasion} onClick={() => setOccasion(o === occasion ? null : o)} className={cn("h-10 rounded-full border-[1.5px] px-3.5 font-semibold", o === occasion ? "border-action bg-action-soft text-action" : "border-line bg-card")}>
                {o}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="cane-panel flex flex-col gap-4 self-start rounded-3xl p-5 lg:sticky lg:top-6">
        <h2 className="relative font-display text-[1.75rem] leading-none font-extrabold text-[#285418] uppercase">Your table</h2>
        <p className="relative">{day ? <><b>{dayName(day)}</b>{chosen ? <> at <b>{chosen}</b></> : ", pick a time"}</> : "Pick a day"}, {people} {people === 1 ? "person" : "people"}{occasion ? `, ${occasion.toLowerCase()}` : ""}</p>
        <label className="relative flex flex-col gap-1.5 text-fine font-semibold">
          Your name
          <input required autoComplete="name" maxLength={80} value={nameValue} onChange={(e) => setName(e.target.value)} className="h-12 rounded-full border border-line bg-card px-4 text-body font-normal" />
        </label>
        <label className="relative flex flex-col gap-1.5 text-fine font-semibold">
          Phone
          <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={telValue} onChange={(e) => setTel(e.target.value)} className="h-12 rounded-full border border-line bg-card px-4 text-body font-normal" />
        </label>
        <label className="relative flex flex-col gap-1.5 text-fine font-semibold">
          Anything the lounge should know <span className="font-normal text-[#3c4a2c]">(optional)</span>
          <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Near a screen for the match, a cake…" className="resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-body font-normal" />
        </label>
        {error && <p role="alert" className="relative rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
        <button type="submit" disabled={pending} className="brass-btn relative inline-flex h-14 items-center justify-center rounded-full px-6 text-[1.0625rem] font-bold disabled:opacity-60">
          {pending ? "Sending…" : "Book the table"}
        </button>
        <p className="relative text-center text-fine text-[#3c4a2c]">The lounge confirms by SMS. Groups for big matches may be asked for a deposit.</p>
      </div>
    </form>
  );
}
