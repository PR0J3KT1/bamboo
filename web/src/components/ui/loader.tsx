"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/* What shows while a page part loads: the barrel from the site's icon, filling up. It fades in
   after a moment, so fast loads never flash it. With reduced motion it stands half full. */

const BODY = "M11 7.5c-2.2 3.6-3.2 8-3.2 12.5s1 8.9 3.2 12.5h18c2.2-3.6 3.2-8 3.2-12.5S31.2 11.1 29 7.5z";

export function Cask({ className }: { className?: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-14", className)}>
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill="#3A230C" />
      <g clipPath={`url(#${clip})`}>
        <rect className="cask-fill" x="6" y="7" width="28" height="26" fill="#C9862A" />
      </g>
      <path d="M9.4 13h21.2M8.2 20h23.6M9.4 27h21.2" stroke="#2A1808" strokeWidth="2.2" />
      <path d={BODY} fill="none" stroke="#2A1808" strokeWidth="1.2" />
      <path className="cask-leaf" d="M27.5 4.2c4.6.4 7.2 3.6 7 8-4.4-.5-7-3.5-7-8z" fill="#8DB36A" />
    </svg>
  );
}

/** A loading state with a short line saying what's coming. `tone="grove"` on the dark green. */
export function Loader({ label, tone = "ground", className }: { label: string; tone?: "ground" | "grove"; className?: string }) {
  return (
    <div role="status" className={cn("loader-in flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-10", className)}>
      <Cask className="size-16" />
      <p className={cn("text-[0.9375rem] font-semibold", tone === "grove" ? "text-on-grove-2" : "text-ink-2")}>{label}</p>
    </div>
  );
}

const bar = "rounded-full bg-ink/8";

/** The menu's shape while it loads: the category rail, a panel of dish cards, the basket. */
export function MenuSkeleton() {
  return (
    <div role="status" className="loader-in mx-auto grid w-full max-w-[1360px] gap-7 px-4 pt-5 pb-10 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)_300px] lg:pt-7">
      <span className="sr-only">Loading the menu</span>
      <div aria-hidden className="flex gap-2 overflow-hidden lg:flex-col">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn(bar, "h-11 w-28 shrink-0 animate-pulse lg:w-full")} style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div aria-hidden className="paper-bg rounded-3xl border border-line p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Cask className="size-10" />
          <div className="flex flex-1 flex-col gap-2">
            <span className={cn(bar, "h-6 w-48")} />
            <span className={cn(bar, "h-3.5 w-72 max-w-full")} />
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] md:gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex animate-pulse flex-col gap-2 overflow-hidden rounded-[14px] border border-line bg-card p-2.5 md:p-3.5" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="-mx-2.5 -mt-2.5 mb-1 aspect-[4/3] bg-ink/8 md:-mx-3.5 md:-mt-3.5" />
              <span className={cn(bar, "h-5 w-3/4")} />
              <span className={cn(bar, "h-3 w-full")} />
              <span className={cn(bar, "mt-2 h-8 w-20")} />
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden className="hidden h-64 animate-pulse rounded-3xl border border-line bg-card lg:block" />
    </div>
  );
}
