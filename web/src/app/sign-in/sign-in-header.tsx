import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/* The grove header every sign-in step shares; the flow passes its own heading and note. */
export function SignInHeader({ title, note }: { title: string; note: string }) {
  return (
    <header className="grove-bg text-on-grove">
      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-4 pb-7">
        <Link href="/" aria-label="Back to the menu" className="-ml-2 flex size-11 items-center justify-center rounded-full">
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="font-stencil text-[2.75rem] leading-[.95] font-black uppercase">{title}</h1>
        <p className="font-serif text-lead text-lime italic">{note}</p>
      </div>
    </header>
  );
}
