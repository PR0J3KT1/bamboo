import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loungePhoto } from "@/lib/pictures";
import { LOUNGE, whatsapp } from "@/lib/lounge";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";
import { BarrelMark, WhatsAppIcon } from "@/components/brand";

/* The rest of the place, from the old site: the sports bar, rooms, events and the car wash, each
   with a photo and a WhatsApp message to ask about it. Then the footer: where, when, how to reach. */

const CARDS: { key: string; kicker: string; title: string; alt: string; body: string; ask: string; text: string; href?: string }[] = [
  { key: "sports", kicker: "Match day", title: "Sports bar and lounge", alt: "The sports bar at Bamboo Cask", body: "Premier League, Champions League, Formula 1, rugby and boxing on big HD screens, with live bands on music nights.", ask: "Book a table", text: "", href: "/book" },
  { key: "rooms", kicker: "Stay", title: "Rooms in Ngara", alt: "A room upstairs at Bamboo Cask", body: "Standard and Deluxe rooms upstairs, from KES 3,500 a night, close to the CBD, Parklands and Pangani. Room service from the kitchen, 24 hours.", ask: "See the rooms and book", text: "", href: "/rooms" },
  { key: "events", kicker: "Gather", title: "Meetings and events", alt: "An event set up at Bamboo Cask", body: "Conference rooms for up to 200 people, and space for birthdays, showers, graduations and private parties, catered by the kitchen.", ask: "Plan an event", text: "Hello Bamboo Cask, I'm planning an event: " },
  { key: "carwash", kicker: "Shine", title: "Car wash and carpets", alt: "The car wash at Bamboo Cask", body: "Leave the car with the wash team while you eat, and drive home in a clean one. Carpets from home or the office too.", ask: "Ask the wash team", text: "Hello Bamboo Cask, about the car wash: " },
];

export async function MoreAtLounge() {
  const { phone } = await getSettings();
  return (
    <section aria-labelledby="more-h" className="flex flex-col gap-4">
      <div>
        <h2 id="more-h" className="font-display text-h2 font-extrabold uppercase md:text-[2.5rem]">More at Keiyo Road</h2>
        <p className="mt-1 font-serif text-lead text-ink-2 italic">Come for the choma. Stay for the match.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 md:gap-4">
        {CARDS.map((c) => {
          const ph = loungePhoto(c.key);
          return (
            <li key={c.key} className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-card">
              {ph && (
                <div className="relative aspect-[16/9]">
                  <Image src={ph.src} alt={c.alt} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                  <span className="absolute top-3 left-3 rounded-full bg-grove/85 px-3 py-1 text-fine font-semibold text-on-grove">{c.kicker}</span>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-display text-[1.5rem] leading-none font-extrabold uppercase">{c.title}</h3>
                <p className="text-ink-2">{c.body}</p>
                {c.href ? (
                  <Link href={c.href} className="mt-auto inline-flex h-11 items-center gap-1.5 self-start rounded-full bg-action px-4 font-semibold text-on-action hover:bg-[color-mix(in_oklab,var(--action),black_12%)]">
                    {c.ask} <ChevronRight aria-hidden className="size-4" />
                  </Link>
                ) : (
                  <a href={whatsapp(phone, c.text)} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full border-[1.5px] border-action px-4 font-semibold text-action hover:bg-action-soft">
                    <WhatsAppIcon className="size-4" /> {c.ask}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export async function LoungeFooter() {
  const { phone, hours } = await getSettings();
  return (
    <footer className="grove-bg text-on-grove">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-4 py-10 pb-32 md:flex-row md:items-start md:justify-between md:px-8 lg:pb-12">
        <div className="flex items-start gap-3">
          <BarrelMark className="size-12 shrink-0" />
          <div>
            <p className="font-stencil text-[1.75rem] leading-none font-black">BAMBOO CASK</p>
            <p className="mt-1.5 font-serif text-lead text-lime italic">Grill, bar and lounge on Keiyo Road, Ngara.</p>
            <nav aria-label="More" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              <Link href="/" className="underline-offset-2 hover:underline">Menu</Link>
              <Link href="/rooms" className="underline-offset-2 hover:underline">Rooms</Link>
              <Link href="/book" className="underline-offset-2 hover:underline">Book a table</Link>
            </nav>
          </div>
        </div>
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-fine text-on-grove-2">Where</dt>
            <dd><a href={LOUNGE.map} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">{LOUNGE.where}</a></dd>
          </div>
          <div>
            <dt className="text-fine text-on-grove-2">When</dt>
            <dd className="font-semibold">{hours}</dd>
          </div>
          <div>
            <dt className="text-fine text-on-grove-2">Call or WhatsApp</dt>
            <dd className="flex flex-wrap gap-x-3">
              <a href={`tel:${phone}`} className="font-semibold underline underline-offset-2">{displayPhone(phone)}</a>
              <a href={whatsapp(phone)} target="_blank" rel="noopener noreferrer" className="font-semibold text-lime underline underline-offset-2">WhatsApp</a>
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
