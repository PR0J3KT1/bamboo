"use client";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BedDouble, ChevronLeft, ChevronRight, Coffee, DoorClosed, Expand, LampDesk, Minus, Plus, Sofa, Tv, Wifi, X } from "lucide-react";
import { todayInNairobi } from "@/lib/age";
import { addDays, bookingMessage, dayName, guestsWord, MAX_NIGHTS, nightsWord, ROOMS, xl, type Amenity, type Room, type RoomTerms } from "@/lib/rooms";
import { requestRoom } from "@/app/actions/bookings";
import { useSession } from "@/lib/auth-client";
import { displayPhone } from "@/lib/phone";
import { whatsapp } from "@/lib/lounge";
import { rememberBooking } from "@/lib/basket";
import { WhatsAppIcon } from "@/components/brand";
import { cn } from "@/lib/utils";

const ICON: Record<Amenity, typeof BedDouble> = { bed: BedDouble, sofa: Sofa, tv: Tv, cup: Coffee, door: DoorClosed, wifi: Wifi, desk: LampDesk };
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

/* today in Nairobi, read in the browser only (the page itself is static) */
const noop = () => () => {};
function useToday() {
  return useSyncExternalStore(noop, () => todayInNairobi(), () => "");
}

export function RoomsView({ terms, phone, locationId, where }: { terms: RoomTerms; phone: string; locationId: string; where: string }) {
  const [roomId, setRoomId] = useState<Room["id"]>("std");
  const room = ROOMS.find((r) => r.id === roomId)!;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Room" className="grid grid-cols-2 gap-2 self-start rounded-2xl bg-ground-2 p-1.5 sm:flex">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === roomId}
            onClick={() => setRoomId(r.id)}
            className={cn("flex flex-col items-start rounded-xl px-4 py-2.5 text-left", r.id === roomId ? "bg-panel shadow-sm" : "text-ink-2 hover:text-ink")}
          >
            <span className="font-display text-[1.375rem] leading-none font-extrabold uppercase">{r.short}</span>
            <span className="text-fine">{terms[r.id].rate ? `${kes(terms[r.id].rate!)} a night` : "Rate on request"}</span>
          </button>
        ))}
      </div>

      <Gallery key={room.id} room={room} onOpen={setOpen} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-labelledby="room-h" className="flex flex-col gap-4">
          <div>
            <h2 id="room-h" className="font-display text-h2 font-extrabold uppercase md:text-[2.5rem]">{room.name}</h2>
            <p className="mt-1 font-serif text-lead text-ink-2 italic">{room.lede}</p>
          </div>
          <p className="max-w-prose text-[1rem]">{room.desc}</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {room.has.map(([k, label]) => {
              const I = ICON[k];
              return (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action"><I aria-hidden className="size-5" strokeWidth={1.8} /></span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2 text-fine">
            {[where, "Close to the CBD, Parklands and Pangani", "Secure parking"].map((t) => (
              <span key={t} className="rounded-full border border-line bg-panel px-3 py-1.5">{t}</span>
            ))}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-ground-2 p-4">
            <span><b>Room service</b> from the kitchen and bar, 24 hours.</span>
            <Link href="/" className="font-semibold text-action underline underline-offset-2">See the menu</Link>
          </p>
        </section>
        <BookingCard room={room} terms={terms} phone={phone} locationId={locationId} />
      </div>

      {open !== null && <Lightbox room={room} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* The photos as a mosaic: the first one large. On a phone they're a row you swipe along. Any of
   them opens full screen. */
function Gallery({ room, onOpen }: { room: Room; onOpen: (i: number) => void }) {
  return (
    <div role="region" aria-label={`Photos of the ${room.name}, ${room.photos.length} photos`} className="-mx-4 md:mx-0">
      <ul className="flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:grid md:auto-rows-[180px] md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 lg:auto-rows-[210px] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {room.photos.map((p, i) => (
          <li key={p.file} className={cn("relative h-[260px] shrink-0 snap-start overflow-hidden rounded-2xl md:h-auto", i === 0 ? "w-[85%] md:col-span-2 md:row-span-2 md:w-auto" : "w-[60%] md:w-auto", i > 4 && "md:hidden")}>
            <button type="button" onClick={() => onOpen(i)} aria-label={`${p.alt}. Photo ${i + 1} of ${room.photos.length}, opens full screen`} className="group absolute inset-0 outline-none focus-visible:ring-4 focus-visible:ring-focus focus-visible:ring-inset">
              <Image src={`/rooms/${p.file}.webp`} alt="" fill priority={i === 0} sizes={i === 0 ? "(min-width: 768px) 50vw, 85vw" : "(min-width: 768px) 25vw, 60vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
              <span className="absolute right-2.5 bottom-2.5 flex size-9 items-center justify-center rounded-full bg-grove/70 text-on-grove opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand aria-hidden className="size-4" />
              </span>
            </button>
            {i === 4 && room.photos.length > 5 && (
              <span className="pointer-events-none absolute inset-0 hidden flex-col items-center justify-center bg-grove/60 text-on-grove md:flex">
                <span className="font-display text-[2rem] leading-none font-extrabold">+{room.photos.length - 5}</span>
                <span className="text-fine font-semibold">more photos</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Full screen, on the native <dialog>: the large copy, its caption, previous and next (buttons,
   arrow keys or a swipe), and Escape or the close button to leave. */
function Lightbox({ room, start, onClose }: { room: Room; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(start);
  const n = room.photos.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const p = room.photos[i];
  const big = xl(p);
  return (
    <dialog
      ref={ref}
      aria-label={`Photos of the ${room.name}`}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
      className="fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none flex-col bg-[#0b0f0c] p-0 text-on-grove backdrop:bg-black/80"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-fine tabular-nums text-on-grove-2" aria-live="polite">{room.short}, photo {i + 1} of {n}</span>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-on-grove/10 hover:bg-on-grove/20">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <Image key={p.file} src={big.src} alt={p.alt} fill sizes="100vw" className="object-contain" />
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>
      <p className="px-4 py-4 text-center font-serif text-lead italic">{p.alt}</p>
    </dialog>
  );
}

function Step({ label, value, words, min, max, onChange }: { label: string; value: number; words: string; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-fine font-semibold" id={`${label}-l`}>{label}</span>
      <div role="group" aria-labelledby={`${label}-l`} className="flex items-center justify-between rounded-full border border-line bg-card p-1">
        <button type="button" aria-label={`One ${label === "Nights" ? "night" : "guest"} fewer`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex size-10 items-center justify-center rounded-full bg-ground-2 disabled:opacity-40">
          <Minus aria-hidden className="size-4" />
        </button>
        <span className="figures text-[1.375rem]" aria-live="polite"><span className="sr-only">{words}</span><span aria-hidden>{value}</span></span>
        <button type="button" aria-label={`One more ${label === "Nights" ? "night" : "guest"}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-10 items-center justify-center rounded-full bg-action text-on-action disabled:opacity-40">
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* Check-in date, nights and guests; what the stay comes to; who's asking. "Send the request"
   saves it for the lounge, who confirm or decline in the admin and text the answer. WhatsApp
   stays as the other way to ask. Nothing is paid on this page. */
function BookingCard({ room, terms, phone, locationId }: { room: Room; terms: RoomTerms; phone: string; locationId: string }) {
  const router = useRouter();
  const today = useToday();
  const session = useSession();
  const [picked, setPicked] = useState("");
  const [nights, setNights] = useState(1);
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState<string | null>(null);
  const [tel, setTel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const { rate, maxGuests } = terms[room.id];
  const people = Math.min(guests, maxGuests);
  const checkIn = picked && today && picked >= today ? picked : today;
  const out = checkIn ? addDays(checkIn, nights) : "";
  /* signed in: start from the account's name and number */
  const u = session.data?.user as { name?: string; phoneNumber?: string | null; dateOfBirth?: string | null } | undefined;
  const nameValue = name ?? (u?.dateOfBirth ? (u.name ?? "") : "");
  const telValue = tel ?? (u?.phoneNumber ? displayPhone(u.phoneNumber) : "");

  function send() {
    setError(null);
    start(async () => {
      const r = await requestRoom({ locationId, room: room.id, checkIn, nights, guests: people, name: nameValue, phone: telValue, note: note || null });
      if (!r.ok) return setError(r.error);
      rememberBooking(r.id, r.code);
      router.push(`/bookings/${r.id}`);
    });
  }

  return (
    <form
      aria-label={`Book the ${room.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="cane-panel flex flex-col gap-4 rounded-3xl p-5 lg:sticky lg:top-6"
    >
      <h3 className="relative font-display text-[1.75rem] leading-none font-extrabold text-[#285418] uppercase">Book the {room.short}</h3>
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor="stay-in" className="text-fine font-semibold">Check in</label>
        <input id="stay-in" type="date" required min={today || undefined} value={checkIn} onChange={(e) => setPicked(e.target.value)} className="h-12 rounded-full border border-line bg-card px-4" />
      </div>
      <div className="relative grid grid-cols-2 gap-3">
        <Step label="Nights" value={nights} words={nightsWord(nights)} min={1} max={MAX_NIGHTS} onChange={setNights} />
        <Step label="Guests" value={people} words={guestsWord(people)} min={1} max={maxGuests} onChange={setGuests} />
      </div>
      {checkIn && (
        <p className="relative">
          <b>{dayName(checkIn)}</b> to <b>{dayName(out)}</b>, {nightsWord(nights)}, {guestsWord(people)}
        </p>
      )}
      <div className="relative flex items-baseline justify-between border-t border-[rgb(110_92_30/0.3)] pt-3">
        <span className="text-[#3c4a2c]">{rate ? `${kes(rate)} × ${nightsWord(nights)}` : `${room.short}, ${nightsWord(nights)}`}</span>
        {rate ? <span className="figures text-[1.75rem] leading-none">{kes(rate * nights)}</span> : <span className="font-semibold">Rate on request</span>}
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-fine font-semibold">
          Your name
          <input required autoComplete="name" maxLength={80} value={nameValue} onChange={(e) => setName(e.target.value)} className="h-12 rounded-full border border-line bg-card px-4 text-body font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-fine font-semibold">
          Phone
          <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={telValue} onChange={(e) => setTel(e.target.value)} className="h-12 rounded-full border border-line bg-card px-4 text-body font-normal" />
        </label>
      </div>
      <label className="relative flex flex-col gap-1.5 text-fine font-semibold">
        Anything the lounge should know <span className="font-normal text-[#3c4a2c]">(optional)</span>
        <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Arriving late, a cot for a child…" className="resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-body font-normal" />
      </label>
      {error && <p role="alert" className="relative rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{error}</p>}
      <button type="submit" disabled={pending || !checkIn} className="brass-btn relative inline-flex h-14 items-center justify-center rounded-full px-6 text-[1.0625rem] font-bold disabled:opacity-60">
        {pending ? "Sending…" : "Send the request"}
      </button>
      <p className="relative text-center text-fine text-[#3c4a2c]">
        The lounge confirms by SMS. Or ask on{" "}
        <a href={whatsapp(phone, checkIn ? bookingMessage(room, rate, checkIn, nights, people) : undefined)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1a7f3f] underline underline-offset-2">
          <WhatsAppIcon className="size-3.5" />WhatsApp
        </a>{" "}
        or call <a href={`tel:${phone}`} className="font-semibold underline underline-offset-2">{displayPhone(phone)}</a>. Nothing is paid on this page.
      </p>
    </form>
  );
}
