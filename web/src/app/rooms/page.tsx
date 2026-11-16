import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoungeFooter } from "@/components/menu/more-at-lounge";
import { getOpenLocations, hereFacts } from "@/lib/locations";
import { fromRate, roomsOffered } from "@/lib/location-extras";
import { LocationPicker } from "@/components/location/here";
import { Loader } from "@/components/ui/loader";
import { RoomsView } from "./rooms-view";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Standard and Deluxe rooms upstairs at Bamboo Cask, with room service from the kitchen, 24 hours.",
};

async function UpstairsAt() {
  const f = await hereFacts();
  const from = fromRate(f.loc.rooms);
  if (!roomsOffered(f.loc.rooms).length) return <p className="font-semibold text-lime">No rooms at Bamboo Cask {f.name}</p>;
  return (
    <>
      <p className="font-semibold text-lime">Upstairs at {f.where}</p>
      {from && <p className="order-last mt-1 font-semibold">From KES {from.toLocaleString("en-KE")} a night</p>}
    </>
  );
}

async function RoomsHere() {
  const [f, open] = await Promise.all([hereFacts(), getOpenLocations()]);
  if (!roomsOffered(f.loc.rooms).length) {
    const withRooms = open.filter((l) => roomsOffered(l.rooms).length);
    return (
      <div className="flex max-w-xl flex-col gap-2 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-h3 font-extrabold uppercase">No rooms at {f.name}</h2>
        <p className="text-ink-2">
          {withRooms.length
            ? `Rooms are at ${withRooms.map((l) => `Bamboo Cask ${l.name}`).join(" and ")}. Choose it above to see them and book.`
            : "None of the lounges has rooms to book just now."}
        </p>
      </div>
    );
  }
  return <RoomsView key={f.loc.id} terms={f.loc.rooms} nearby={f.loc.rooms.nearby} phone={f.phone} locationId={f.loc.id} name={f.name} where={f.where} />;
}

export default function RoomsPage() {
  return (
    <>
      <header className="relative isolate overflow-hidden bg-grove text-on-grove">
        <Image src="/rooms/dlx-3-xl.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(14_28_19/0.8)_0%,rgb(14_28_19/0.5)_50%,rgb(14_28_19/0.92)_100%)] md:bg-[linear-gradient(90deg,rgb(14_28_19/0.92)_0%,rgb(14_28_19/0.6)_50%,rgb(14_28_19/0.25)_100%)]" />
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-[18px]">
          <Link href="/" aria-label="Bamboo Cask, back to the menu"><Brand /></Link>
          <Link href="/" className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold hover:bg-on-grove/10">
            <ChevronLeft aria-hidden className="size-5" /> Menu
          </Link>
        </div>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pt-12 pb-10 md:px-8 md:pt-20 md:pb-16">
          <h1 className="order-1 font-stencil text-h1 font-black md:text-[5rem]">ROOMS UPSTAIRS</h1>
          <p className="order-2 max-w-md font-serif text-lead italic md:text-[1.25rem]">Sleep upstairs from the grill. Order dinner to the room, and breakfast in the morning.</p>
          <Suspense fallback={<p className="font-semibold text-lime">Upstairs at the lounge</p>}>
            <UpstairsAt />
          </Suspense>
          <div className="order-last">
            <Suspense fallback={null}>
              <LocationPicker label="Rooms at" />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-8 md:py-10">
        <Suspense fallback={<Loader label="Opening the rooms" />}>
          <RoomsHere />
        </Suspense>
      </main>
      <Suspense fallback={<div className="grove-bg h-64" />}>
        <LoungeFooter />
      </Suspense>
    </>
  );
}
