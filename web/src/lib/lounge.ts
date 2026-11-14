/* The lounge's fixed facts. What staff can change (hours, phone, rating, room rates, whether
   ordering is open) is in Settings, read with getSettings() from src/lib/settings.ts. */

export const LOUNGE = {
  name: "Bamboo Cask Lounge",
  where: "Keiyo Road, Ngara",
  map: "https://www.google.com/maps/search/?api=1&query=Bamboo+Cask+Lounge+Keiyo+Road+Ngara",
};

/** A WhatsApp chat with the lounge's number (E.164), the message typed in for them. */
export function whatsapp(phone: string, text?: string) {
  return `https://wa.me/${phone.replace(/^\+/, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
