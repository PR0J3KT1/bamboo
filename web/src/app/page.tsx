import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "@/components/menu";
import { ViewerBar } from "@/components/viewer-bar";
import { ModeSwitch } from "@/components/order/mode-switch";
import { Brand } from "@/components/brand";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getSettings, type LoungeSettings } from "@/lib/settings";
import { hereFacts } from "@/lib/locations";
import { roomsOffered } from "@/lib/location-extras";
import { HereLine, LocationPicker } from "@/components/location/here";
import { LoungeFooter } from "@/components/menu/more-at-lounge";
import { loungePhoto } from "@/lib/pictures";
import { MenuSkeleton } from "@/components/ui/loader";

const rated = (s: LoungeSettings) => s.rating && `${s.rating.stars} stars from ${s.rating.reviews.toLocaleString("en-KE")} Google reviews`;

/* What this lounge has, under the hero: only what it offers. Reads the location cookie. */
async function HeroFacts({ settings }: { settings: LoungeSettings }) {
  const { loc } = await hereFacts();
  const x = loc.extras;
  const facts: React.ReactNode[] = [rated(settings)];
  if (x.sports.on) facts.push(<Link href="/book" className="underline underline-offset-2 hover:text-on-grove">Live sport on big screens: book a table</Link>);
  if (roomsOffered(loc.rooms).length) facts.push(<Link href="/rooms" className="underline underline-offset-2 hover:text-on-grove">Rooms upstairs</Link>);
  if (x.events.on || x.carwash.on) facts.push(x.events.on && x.carwash.on ? "Events and a car wash" : x.events.on ? "Meetings and events" : "A car wash");
  return <FactList facts={facts} />;
}

function FactList({ facts }: { facts: React.ReactNode[] }) {
  const shown = facts.filter(Boolean);
  if (!shown.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-on-grove/15 pt-4 text-[0.875rem] text-on-grove-2">
      {shown.map((f, i) => (
        <li key={i} className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-lime" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const settings = await getSettings();
  const hero = loungePhoto("hero");
  return (
    <>
      <header className="relative isolate overflow-hidden bg-grove text-on-grove">
        {hero && <Image src={hero.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />}
        {/* dark enough to read over, warm where the coals are */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(14_28_19/0.78)_0%,rgb(14_28_19/0.55)_45%,rgb(14_28_19/0.92)_100%),radial-gradient(70%_90%_at_12%_120%,rgb(201_138_30/0.35),transparent_60%)] md:bg-[linear-gradient(90deg,rgb(14_28_19/0.92)_0%,rgb(14_28_19/0.7)_45%,rgb(14_28_19/0.35)_100%),radial-gradient(70%_90%_at_12%_120%,rgb(201_138_30/0.35),transparent_60%)]" />
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-[18px]">
          <Brand />
          <Suspense fallback={<span className="h-11 w-24" />}>
            <ViewerBar />
          </Suspense>
        </div>
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 pt-8 pb-7 md:px-8 md:pt-14 md:pb-11">
          <p className="font-semibold text-lime">
            <Suspense fallback={<>{settings.hours}.</>}>
              <HereLine />
            </Suspense>
          </p>
          <h1 className="font-stencil text-h1 font-black md:text-[5rem]">
            CHARCOAL. <br />
            CASK. <br className="md:hidden" />
            COMPANY.
          </h1>
          <p className="max-w-md font-serif text-lead text-on-grove italic md:text-[1.25rem]">
            Kienyeji off the coals, a bottle from the Cask Room, and a rider to bring both to your gate.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <ModeSwitch />
            <Suspense fallback={null}>
              <LocationPicker />
            </Suspense>
          </div>
          <Suspense fallback={<FactList facts={[rated(settings)]} />}>
            <HeroFacts settings={settings} />
          </Suspense>
        </div>
      </header>
      <Suspense fallback={<MenuSkeleton />}>
        <Menu />
      </Suspense>
      <Suspense fallback={<div className="grove-bg h-64" />}>
        <LoungeFooter />
      </Suspense>
      <Suspense fallback={null}>
        <WhatsAppButton />
      </Suspense>
    </>
  );
}
