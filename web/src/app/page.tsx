import { Suspense } from "react";
import { Menu } from "@/components/menu";
import { ViewerBar } from "@/components/viewer-bar";

export default function Home() {
  return (
    <>
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-4 pb-6 md:px-8 md:pb-9">
          <div className="flex items-center justify-between gap-3">
            <span className="font-stencil text-[1.5rem] font-black tracking-[.02em]">BAMBOO CASK</span>
            <Suspense fallback={<span className="h-11 w-24" />}>
              <ViewerBar />
            </Suspense>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <h1 className="font-stencil text-h1 font-black md:text-[4.5rem]">
              CHARCOAL. <br className="md:hidden" />
              CASK. <br className="md:hidden" />
              COMPANY.
            </h1>
            <p className="max-w-sm font-serif text-lead text-lime italic">
              Choma off the coals on Keiyo Road, brought to your door.
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        <Suspense fallback={<p className="text-ink-2">Loading the menu…</p>}>
          <Menu />
        </Suspense>
      </main>
    </>
  );
}
