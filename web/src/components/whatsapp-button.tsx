import { hereFacts } from "@/lib/locations";
import { whatsapp } from "@/lib/lounge";
import { displayPhone } from "@/lib/phone";
import { WhatsAppIcon } from "@/components/brand";

/** WhatsApp the lounge: a round green button, low on the right. On phones it sits above the
    basket bar. */
export async function WhatsAppButton() {
  const { phone } = await hereFacts();
  return (
    <a
      href={whatsapp(phone, "Hello Bamboo Cask, ")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp the lounge on ${displayPhone(phone)}`}
      className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+72px)] z-30 flex size-14 items-center justify-center rounded-full bg-[#1fa855] text-white shadow-lift transition-transform hover:scale-105 lg:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
