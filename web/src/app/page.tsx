import { Suspense } from "react";
import Image from "next/image";
import { Menu } from "@/components/menu";
import { ViewerBar } from "@/components/viewer-bar";
import { ModeSwitch } from "@/components/order/mode-switch";
import { Brand, WhatsAppButton } from "@/components/brand";
import { LoungeFooter } from "@/components/menu/more-at-lounge";
import { loungePhoto } from "@/lib/pictures";
import { LOUNGE } from "@/lib/lounge";

export default function Home() {
  const hero = loungePhoto("hero");
  const facts = [
    LOUNGE.rating && `${LOUNGE.rating.stars} stars from ${LOUNGE.rating.reviews.toLocaleString("en-KE")} Google reviews`,
    "Live sport on big screens",
    "Rooms upstairs",
    "Events and a car wash",
  ].filter(Boolean) as string[];
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
          <p className="font-semibold text-lime">{LOUNGE.where}. {LOUNGE.hours}.</p>
          <h1 className="font-stencil text-h1 font-black md:text-[5rem]">
            CHARCOAL. <br />
            CASK. <br className="md:hidden" />
            COMPANY.
          </h1>
          <p className="max-w-md font-serif text-lead text-on-grove italic md:text-[1.25rem]">
            Kienyeji off the coals, a bottle from the Cask Room, and a rider to bring both to your gate.
          </p>
          <ModeSwitch />
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-on-grove/15 pt-4 text-[0.875rem] text-on-grove-2">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-lime" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </header>
      <Suspense fallback={<p className="mx-auto w-full max-w-[1360px] px-4 py-6 text-ink-2 md:px-8">Loading the menu…</p>}>
        <Menu />
      </Suspense>
      <LoungeFooter />
      <WhatsAppButton />
    </>
  );
}
