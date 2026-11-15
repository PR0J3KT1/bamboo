"use client";
import { useEffect } from "react";
import Link from "next/link";
import { BarrelMark } from "@/components/brand";

/* Something broke on a page: say what to do, and let them try again. Nothing technical. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" tabIndex={-1} className="grove-bg flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center text-on-grove">
      <BarrelMark className="size-16" />
      <h1 className="font-stencil text-h1 font-black uppercase">Something went wrong</h1>
      <p className="max-w-md font-serif text-lead text-lime italic">This page didn&rsquo;t load. Try again; if it keeps happening, call or WhatsApp the lounge.</p>
      {error.digest && <p className="text-fine text-on-grove-2">Reference {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="h-12 rounded-full bg-lime px-6 font-bold text-on-lime">Try again</button>
        <Link href="/" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">See the menu</Link>
      </div>
    </main>
  );
}
