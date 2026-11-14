import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoungeFooter } from "@/components/menu/more-at-lounge";
import { LOUNGE } from "@/lib/lounge";
import { getSettings } from "@/lib/settings";
import { ROOMS } from "@/lib/rooms";
import { RoomsView } from "./rooms-view";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Standard and Deluxe rooms upstairs at Bamboo Cask, Keiyo Road, Ngara. From KES 3,500 a night, with room service from the kitchen, 24 hours.",
};

export default async function RoomsPage() {
  const settings = await getSettings();
  const rates = ROOMS.map((r) => settings.rooms[r.id].rate).filter((r): r is number => r !== null);
  const from = rates.length ? Math.min(...rates) : null;
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
          <p className="font-semibold text-lime">Upstairs at {LOUNGE.where}</p>
          <h1 className="font-stencil text-h1 font-black md:text-[5rem]">ROOMS UPSTAIRS</h1>
          <p className="max-w-md font-serif text-lead italic md:text-[1.25rem]">Sleep upstairs from the grill. Order dinner to the room, and breakfast in the morning.</p>
          {from && <p className="mt-1 font-semibold">From KES {from.toLocaleString("en-KE")} a night</p>}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-8 md:py-10">
        <RoomsView terms={settings.rooms} phone={settings.phone} />
      </main>
      <LoungeFooter />
    </>
  );
}
