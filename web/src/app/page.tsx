import { Suspense } from "react";
import { Menu } from "@/components/menu";
import { ViewerBar } from "@/components/viewer-bar";
import { ModeSwitch } from "@/components/order/mode-switch";

export default function Home() {
  return (
    <>
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-[18px]">
          <span className="font-stencil text-[1.5rem] font-black tracking-[.02em] md:text-[1.75rem]">BAMBOO CASK</span>
          <Suspense fallback={<span className="h-11 w-24" />}>
            <ViewerBar />
          </Suspense>
        </div>
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 pt-5 pb-[22px] md:px-8 md:pt-4 md:pb-9">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <h1 className="font-stencil text-h1 font-black md:text-[4.5rem]">
              CHARCOAL. <br className="md:hidden" />
              CASK. <br className="md:hidden" />
              COMPANY.
            </h1>
            <p className="max-w-sm font-serif text-lead text-lime italic">Choma off the coals on Keiyo Road, brought to your door or ready at the counter.</p>
          </div>
          <ModeSwitch />
        </div>
      </header>
      <Suspense fallback={<p className="mx-auto w-full max-w-[1360px] px-4 py-6 text-ink-2 md:px-8">Loading the menu…</p>}>
        <Menu />
      </Suspense>
    </>
  );
}
