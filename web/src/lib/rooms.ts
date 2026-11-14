/* The rooms upstairs, from the old site. Photos are the lounge's own (public/rooms): each is
   [file, width at 760px tall, what it shows], with an -xl copy for full screen (1600 on its long
   side). Rates and how many can stay are in Settings (src/lib/settings.ts): a room with no rate
   asks for it instead of showing a total. */

export type Amenity = "bed" | "sofa" | "tv" | "cup" | "door" | "wifi" | "desk";
export type RoomPhoto = { file: string; width: number; height: number; alt: string };
export type Room = {
  id: "std" | "dlx";
  name: string;
  short: string;
  lede: string;
  desc: string;
  has: [Amenity, string][];
  photos: RoomPhoto[];
};

const ph = (file: string, width: number, alt: string): RoomPhoto => ({ file, width, height: 760, alt });

export const ROOMS: Room[] = [
  {
    id: "std",
    name: "Standard room",
    short: "Standard",
    lede: "For a work trip or a short stay.",
    desc: "Cream walls, timber floors, a sitting corner by the window and the bed under its net. Upstairs from the grill, so dinner is a short walk or a call away.",
    has: [
      ["bed", "Double bed under a mosquito net"],
      ["sofa", "Sitting corner with a sofa"],
      ["tv", "Wall TV"],
      ["cup", "Mini fridge, kettle and drinking water"],
      ["door", "Wardrobe and an en-suite bathroom"],
      ["wifi", "Wi-Fi and daily housekeeping"],
    ],
    photos: [
      ph("std-1", 1013, "A sofa and footstool, and the bed under its net"),
      ph("std-2", 570, "The bed under its mosquito net"),
      ph("std-3", 1013, "The sitting corner, with a wall TV, a mini fridge and a kettle"),
      ph("std-4", 1013, "From the bed to the door"),
      ph("std-5", 1013, "Another Standard room, with a brown sofa set"),
      ph("std-6", 1013, "The same room, seen from the bed"),
      ph("std-7", 1013, "The wardrobe, a kettle and the bathroom door"),
    ],
  },
  {
    id: "dlx",
    name: "Deluxe room",
    short: "Deluxe",
    lede: "More room, for longer stays.",
    desc: "Timber ceilings, a four-poster bed under a canopy net, and space to sit or work. The largest has its own lounge corner with an L-shaped sofa.",
    has: [
      ["bed", "Four-poster bed with a canopy net"],
      ["sofa", "Lounge corner with an L-shaped sofa, in the largest room"],
      ["desk", "Work desk and chair"],
      ["tv", "Wall TV"],
      ["cup", "Vanity with a mirror, mini fridge and kettle"],
      ["wifi", "En-suite bathroom, Wi-Fi and daily housekeeping"],
    ],
    photos: [
      ph("dlx-1", 570, "The lounge corner, with an L-shaped sofa and a wall TV"),
      ph("dlx-2", 570, "A four-poster bed under its canopy net"),
      ph("dlx-3", 1013, "The bed, the desk and the timber ceiling"),
      ph("dlx-4", 570, "A bed by the window, with a wall TV and a dresser"),
      ph("dlx-5", 570, "The bed beside a slatted room divider"),
      ph("dlx-6", 1013, "A work desk by the door"),
      ph("dlx-7", 570, "A four-poster bed and the wardrobe"),
      ph("dlx-8", 570, "The vanity, with a mini fridge, a kettle and drinking water"),
    ],
  },
];

export const MAX_NIGHTS = 30;
export type RoomTerms = Record<Room["id"], { rate: number | null; maxGuests: number }>;
export const isRoomId = (x: string): x is Room["id"] => x === "std" || x === "dlx";

/** The full-screen copy of a photo and its size. */
export function xl(p: RoomPhoto) {
  const landscape = p.width > p.height;
  return { src: `/rooms/${p.file}-xl.webp`, width: landscape ? 1600 : 1200, height: landscape ? 1200 : 1600 };
}

/* ── the stay: dates are "YYYY-MM-DD" calendar days ── */

export function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dayName(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export const nightsWord = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;
export const guestsWord = (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`;

/** The WhatsApp message asking for the room: dates, nights, guests, and the total or the rate question. */
export function bookingMessage(room: Room, rate: number | null, checkIn: string, nights: number, guests: number, code?: string) {
  const out = addDays(checkIn, nights);
  const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
  return (
    `Hello Bamboo Cask, ${code ? `about my request ${code}: ` : ""}I'd like to book a ${room.name}: check in ${dayName(checkIn)}, check out ${dayName(out)} ` +
    `(${nightsWord(nights)}), ${guestsWord(guests)}. ` +
    (rate ? `That's ${kes(rate * nights)} at ${kes(rate)} a night. Is it free?` : `What is the ${room.short} rate for those nights?`)
  );
}
