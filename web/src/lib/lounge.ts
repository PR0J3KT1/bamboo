import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";

/* The lounge's own facts, in one place. The phone and hours are the ones on the old site;
   LOUNGE_PHONE overrides the number. The Google rating stays off until someone confirms a
   current figure: set `rating` to e.g. { stars: 4.5, reviews: 1462 } to show it. */

const phone = normalizeKenyanPhone(process.env.LOUNGE_PHONE || "0754 346 559") ?? "+254754346559";

export const LOUNGE = {
  name: "Bamboo Cask Lounge",
  where: "Keiyo Road, Ngara",
  hours: "Open daily, 8am till late",
  phone, // E.164
  phoneShown: displayPhone(phone),
  map: "https://www.google.com/maps/search/?api=1&query=Bamboo+Cask+Lounge+Keiyo+Road+Ngara",
  rating: null as { stars: number; reviews: number } | null,
};

/** A WhatsApp chat with the lounge, the message typed in for them. */
export function whatsapp(text?: string) {
  return `https://wa.me/${LOUNGE.phone.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
