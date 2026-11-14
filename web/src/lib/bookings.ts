/* Bookings without the database: checking a request, the steps a booking can take, and the text
   the customer gets. Pure, so it's tested in bookings.test.ts and shared by the server actions,
   the admin and the customer's booking page. Dates are "YYYY-MM-DD" days and "HH:MM" times in
   Nairobi (UTC+3, no daylight saving). */
import { addDays, dayName, MAX_NIGHTS, nightsWord, ROOMS, isRoomId, type RoomTerms } from "@/lib/rooms";

export type BookingStatus = "requested" | "confirmed" | "declined" | "cancelled" | "completed";
export type BookingKind = "room" | "table";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Waiting for the lounge",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Done",
};

/** What staff can do next with a booking. */
const NEXT: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  declined: [],
  cancelled: [],
  completed: [],
};
export function canMoveBooking(from: BookingStatus, to: BookingStatus) {
  return NEXT[from].includes(to);
}

export const OCCASIONS = ["Dinner", "Match day", "Birthday", "Work meeting", "Date night", "Other"] as const;
export const MAX_AHEAD_DAYS = { room: 365, table: 60 };
export const OPEN_REQUESTS_PER_PHONE = 3;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function checkRoom(
  input: { room: string; checkIn: string; nights: number; guests: number },
  today: string,
  terms: RoomTerms,
): Result<{ room: "std" | "dlx"; checkIn: string; nights: number; guests: number; rate: number | null }> {
  if (!isRoomId(input.room)) return { ok: false, error: "Pick a room." };
  if (!DAY.test(input.checkIn) || addDays(input.checkIn, 0) !== input.checkIn) return { ok: false, error: "Pick a check-in date." };
  if (input.checkIn < today) return { ok: false, error: "The check-in date has passed. Pick today or later." };
  if (input.checkIn > addDays(today, MAX_AHEAD_DAYS.room)) return { ok: false, error: "Rooms can be asked for up to a year ahead." };
  if (!Number.isInteger(input.nights) || input.nights < 1 || input.nights > MAX_NIGHTS) return { ok: false, error: `Stay between 1 and ${MAX_NIGHTS} nights. For longer, call the lounge.` };
  const t = terms[input.room];
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > t.maxGuests) return { ok: false, error: `The ${ROOMS.find((r) => r.id === input.room)!.short} room takes up to ${t.maxGuests} ${t.maxGuests === 1 ? "guest" : "guests"}.` };
  return { ok: true, data: { room: input.room, checkIn: input.checkIn, nights: input.nights, guests: input.guests, rate: t.rate } };
}

export function checkTable(
  input: { date: string; time: string; people: number; occasion: string | null },
  today: string,
  nowHHMM: string,
  tables: { open: boolean; from: string; to: string; maxPeople: number },
): Result<{ at: Date; people: number; occasion: string | null }> {
  if (!tables.open) return { ok: false, error: "Table booking is closed online just now. Call or WhatsApp the lounge." };
  if (!DAY.test(input.date) || addDays(input.date, 0) !== input.date) return { ok: false, error: "Pick a date." };
  if (input.date < today) return { ok: false, error: "That date has passed." };
  if (input.date > addDays(today, MAX_AHEAD_DAYS.table)) return { ok: false, error: `Tables can be booked up to ${MAX_AHEAD_DAYS.table} days ahead.` };
  if (!TIME.test(input.time)) return { ok: false, error: "Pick a time." };
  const m = minutes(input.time);
  if (m < minutes(tables.from) || m > minutes(tables.to)) return { ok: false, error: `Tables are booked between ${tables.from} and ${tables.to}.` };
  if (input.date === today && m < minutes(nowHHMM) + 30) return { ok: false, error: "Book at least half an hour ahead. For sooner, call the lounge." };
  if (!Number.isInteger(input.people) || input.people < 1 || input.people > tables.maxPeople) return { ok: false, error: `Book for 1 to ${tables.maxPeople} people. For a bigger group, plan an event with the lounge.` };
  const occasion = input.occasion && (OCCASIONS as readonly string[]).includes(input.occasion) ? input.occasion : null;
  return { ok: true, data: { at: new Date(`${input.date}T${input.time}:00+03:00`), people: input.people, occasion } };
}

/** "Sat, 14 Nov at 19:30", in Nairobi. */
export function tableWhen(at: Date) {
  const day = at.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi" });
  return `${day} at ${time}`;
}

type BookingFacts = { code: string; kind: BookingKind; room: string | null; checkIn: string | null; nights: number | null; guests: number; at: Date | null };

/** One line saying what was booked: "Standard room, Sat, 14 Nov to Mon, 16 Nov (2 nights), 2 guests". */
export function bookingSummary(b: BookingFacts) {
  if (b.kind === "room" && b.checkIn && b.nights) {
    const room = ROOMS.find((r) => r.id === b.room);
    return `${room?.name ?? "Room"}, ${dayName(b.checkIn)} to ${dayName(addDays(b.checkIn, b.nights))} (${nightsWord(b.nights)}), ${b.guests} ${b.guests === 1 ? "guest" : "guests"}`;
  }
  return `Table for ${b.guests}${b.at ? `, ${tableWhen(b.at)}` : ""}`;
}

/** The SMS a customer gets when their booking is confirmed or declined. */
export function bookingSms(b: BookingFacts, to: "confirmed" | "declined", reply: string | null, loungePhone: string) {
  const what = b.kind === "room" ? "room" : "table";
  const head = to === "confirmed" ? `Bamboo Cask: your ${what} ${b.code} is confirmed. ${bookingSummary(b)}.` : `Bamboo Cask: sorry, we can't take your ${what} ${b.code}.`;
  return [head, reply?.trim(), `Questions? ${loungePhone}`].filter(Boolean).join(" ");
}
