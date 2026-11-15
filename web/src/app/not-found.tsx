import Link from "next/link";
import { BarrelMark } from "@/components/brand";

/* A page that isn't there: say so plainly and point back to the menu. */
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="grove-bg flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center text-on-grove">
      <BarrelMark className="size-16" />
      <h1 className="font-stencil text-h1 font-black uppercase md:text-[4.5rem]">Not on the menu</h1>
      <p className="max-w-md font-serif text-lead text-lime italic">That page isn&rsquo;t here. It may have moved, or the link was cut short.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="flex h-12 items-center rounded-full bg-lime px-6 font-bold text-on-lime">See the menu</Link>
        <Link href="/rooms" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Rooms</Link>
        <Link href="/games" className="flex h-12 items-center rounded-full border-[1.5px] border-on-grove/30 px-5 font-semibold">Games</Link>
      </div>
    </main>
  );
}
