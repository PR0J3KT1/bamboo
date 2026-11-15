import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoungeFooter } from "@/components/menu/more-at-lounge";
import { getSettings, type LoungeSettings } from "@/lib/settings";
import { hereFacts } from "@/lib/locations";
import { HereLine, LocationPicker } from "@/components/location/here";
import { Loader } from "@/components/ui/loader";
import { loungePhoto } from "@/lib/pictures";
import { TableForm } from "./table-form";

export const metadata: Metadata = {
  title: "Book a table",
  description: "Book a table at Bamboo Cask, Keiyo Road, Ngara: dinner, match day, birthdays. The lounge confirms by SMS.",
};

/* The form for the customer's lounge, with its phone for "book by phone". */
async function BookHere({ tables }: { tables: LoungeSettings["tables"] }) {
  const f = await hereFacts();
  return <TableForm key={f.loc.id} tables={tables} phone={f.phone} locationId={f.loc.id} />;
}

export default async function BookPage() {
  const settings = await getSettings();
  const ph = loungePhoto("sports");
  return (
    <>
      <header className="relative isolate overflow-hidden bg-grove text-on-grove">
        {ph && <Image src={ph.src} alt="" fill priority sizes="100vw" className="-z-20 scale-105 object-cover blur-[2px]" />}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(14_28_19/0.82)_0%,rgb(14_28_19/0.6)_50%,rgb(14_28_19/0.94)_100%)] md:bg-[linear-gradient(90deg,rgb(14_28_19/0.94)_0%,rgb(14_28_19/0.65)_55%,rgb(14_28_19/0.3)_100%)]" />
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-[18px]">
          <Link href="/" aria-label="Bamboo Cask, back to the menu"><Brand /></Link>
          <Link href="/" className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold hover:bg-on-grove/10">
            <ChevronLeft aria-hidden className="size-5" /> Menu
          </Link>
        </div>
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 pt-12 pb-10 md:px-8 md:pt-16 md:pb-14">
          <p className="font-semibold text-lime">
            <Suspense fallback={<>{settings.hours}.</>}>
              <HereLine />
            </Suspense>
          </p>
          <h1 className="font-stencil text-h1 font-black md:text-[5rem]">BOOK A TABLE</h1>
          <p className="max-w-md font-serif text-lead italic md:text-[1.25rem]">For dinner, the big match or a birthday. Groups for the derby: book ahead.</p>
          <Suspense fallback={null}>
            <LocationPicker label="Booking at" />
          </Suspense>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:px-8 md:py-10">
        <Suspense fallback={<Loader label="Opening the book" />}>
          <BookHere tables={settings.tables} />
        </Suspense>
      </main>
      <Suspense fallback={<div className="grove-bg h-64" />}>
        <LoungeFooter />
      </Suspense>
    </>
  );
}
