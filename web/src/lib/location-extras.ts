import { z } from "zod";

/* What each location offers beyond the menu: its rooms (which, at what rate, for how many) and
   the "More at …" cards (the sports bar, events, the car wash). Kept as JSON on the location.
   No database here, so it's tested on its own and safe in the browser. */

const room = z.object({
  offered: z.boolean(),
  rate: z.number({ error: "The rate is a number of shillings, or blank." }).int("The rate is whole shillings.").min(100, "A room rate is at least KES 100, or blank for “on request”.").max(1_000_000, "That room rate looks too high.").nullable(),
  maxGuests: z.number({ error: "Most guests: a whole number." }).int("Most guests: a whole number.").min(1, "A room takes at least 1 guest.").max(10, "A room takes up to 10 guests."),
});

export const RoomsSchema = z.object({
  std: room,
  dlx: room,
  /* what's near, for guests: "Close to the CBD, Parklands and Pangani" */
  nearby: z.string().trim().max(80, "Keep what's nearby to 80 characters.").nullable().transform((v) => v || null),
});
export type LocationRooms = z.output<typeof RoomsSchema>;

export const EXTRA_KEYS = ["sports", "events", "carwash"] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];

const extra = z.object({
  on: z.boolean(),
  /* blank: the standard words below */
  body: z.string().trim().max(240, "Keep each card to 240 characters.").nullable().transform((v) => v || null),
});
export const ExtrasSchema = z.object({ sports: extra, events: extra, carwash: extra });
export type LocationExtras = z.output<typeof ExtrasSchema>;

/** The cards, and the words a card shows when the location hasn't written its own. */
export const EXTRAS: Record<ExtraKey, { kicker: string; title: string; alt: string; body: string; ask: string; text: string; href?: string }> = {
  sports: { kicker: "Match day", title: "Sports bar and lounge", alt: "The sports bar at Bamboo Cask", body: "Premier League, Champions League, Formula 1, rugby and boxing on big HD screens, with live bands on music nights.", ask: "Book a table", text: "", href: "/book" },
  events: { kicker: "Gather", title: "Meetings and events", alt: "An event set up at Bamboo Cask", body: "Conference rooms for up to 200 people, and space for birthdays, showers, graduations and private parties, catered by the kitchen.", ask: "Plan an event", text: "I'm planning an event: " },
  carwash: { kicker: "Shine", title: "Car wash and carpets", alt: "The car wash at Bamboo Cask", body: "Leave the car with the wash team while you eat, and drive home in a clean one. Carpets from home or the office too.", ask: "Ask the wash team", text: "About the car wash: " },
};

export const DEFAULT_ROOMS: LocationRooms = {
  std: { offered: true, rate: 3500, maxGuests: 2 },
  dlx: { offered: true, rate: null, maxGuests: 2 },
  nearby: null,
};
export const DEFAULT_EXTRAS: LocationExtras = {
  sports: { on: true, body: null },
  events: { on: true, body: null },
  carwash: { on: true, body: null },
};

/* What a new location starts with: no rooms and no cards, until its admin says what it has. */
export const NO_ROOMS: LocationRooms = { std: { ...DEFAULT_ROOMS.std, offered: false }, dlx: { ...DEFAULT_ROOMS.dlx, offered: false }, nearby: null };
export const NO_EXTRAS: LocationExtras = { sports: { on: false, body: null }, events: { on: false, body: null }, carwash: { on: false, body: null } };

/** The rooms this location offers, Standard first. */
export function roomsOffered(rooms: LocationRooms) {
  return (["std", "dlx"] as const).filter((id) => rooms[id].offered);
}

/** The lowest rate among the rooms offered, or null when none has a rate. */
export function fromRate(rooms: LocationRooms) {
  const rates = roomsOffered(rooms).map((id) => rooms[id].rate).filter((r): r is number => r !== null);
  return rates.length ? Math.min(...rates) : null;
}
