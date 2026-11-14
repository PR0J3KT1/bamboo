import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { whatsapp } from "@/lib/lounge";
import { displayPhone } from "@/lib/phone";
import { bookingSummary, STATUS_LABEL } from "@/lib/bookings";
import { WhatsAppIcon } from "@/components/brand";
import { buttonStyles } from "@/components/ui/button";
import { CancelBooking } from "./cancel-booking";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEAD = {
  requested: "Request sent",
  confirmed: "Confirmed",
  declined: "Not this time",
  cancelled: "Cancelled",
  completed: "Thank you",
} as const;

/* A booking's own page: its address holds the random id, so only the person with the link sees it.
   Shows what was asked for, where it stands, the lounge's reply, and lets the customer cancel. */
async function Booking({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [[b], settings] = await Promise.all([db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1), getSettings()]);
  if (!b) notFound();
  const total = b.kind === "room" && b.rate && b.nights ? b.rate * b.nights : null;
  const lede =
    b.status === "requested"
      ? `The lounge will confirm by SMS to ${displayPhone(b.phone)}.`
      : b.status === "confirmed"
        ? b.kind === "room" ? "Your room is held. See you at Keiyo Road." : "Your table is held. See you at Keiyo Road."
        : b.status === "declined"
          ? "The lounge couldn't take this one. Their note is below."
          : b.status === "cancelled"
            ? "This booking was cancelled."
            : "We hope you enjoyed it.";
  return (
    <>
      <header className="grove-bg relative text-on-grove">
        <div className="mx-auto flex max-w-2xl flex-col gap-3.5 px-4 pt-4 pb-7">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{b.kind === "room" ? "Room" : "Table"} {b.code}</span>
            <Link href="/" className="flex h-11 items-center font-semibold">Menu</Link>
          </div>
          <h1 className="font-stencil text-[3.25rem] leading-[.9] font-black uppercase">{HEAD[b.status]}</h1>
          <p className="font-serif text-lead text-lime italic">{lede}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4">
          <div className="flex justify-between gap-3"><span className="text-ink-2">Status</span><span className="font-semibold">{STATUS_LABEL[b.status]}</span></div>
          <div className="flex justify-between gap-3"><span className="text-ink-2">Booking</span><span className="text-right">{bookingSummary(b)}</span></div>
          {b.occasion && <div className="flex justify-between gap-3"><span className="text-ink-2">Occasion</span><span>{b.occasion}</span></div>}
          <div className="flex justify-between gap-3"><span className="text-ink-2">Name</span><span>{b.name}</span></div>
          {b.note && <div className="flex justify-between gap-3"><span className="text-ink-2">Your note</span><span className="text-right">{b.note}</span></div>}
          {b.kind === "room" && (
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
              <span className="font-bold">{total ? "Comes to" : "Rate"}</span>
              {total ? <span className="figures text-[1.5rem]">KES {total.toLocaleString("en-KE")}</span> : <span>On request</span>}
            </div>
          )}
        </section>
        {b.reply && (
          <section className="rounded-2xl bg-action-soft p-4">
            <p className="text-fine font-semibold text-action">From the lounge</p>
            <p className="mt-1">{b.reply}</p>
          </section>
        )}
        <p className="text-fine text-ink-2">Nothing is paid online. {b.kind === "room" ? "Pay at the lounge when you check in." : ""}</p>
        <div className="flex flex-wrap gap-3">
          <a href={whatsapp(settings.phone, `Hello Bamboo Cask, about my booking ${b.code}: `)} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1fa855] px-5 font-bold text-white">
            <WhatsAppIcon className="size-5" /> WhatsApp the lounge
          </a>
          <a href={`tel:${settings.phone}`} className={buttonStyles({ variant: "outline", size: "lg" })}>Call {displayPhone(settings.phone)}</a>
        </div>
        {(b.status === "requested" || b.status === "confirmed") && <CancelBooking id={b.id} />}
      </main>
    </>
  );
}

export default function BookingPage(props: PageProps<"/bookings/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-ink-2">Loading your booking…</p>}>
      <Booking params={props.params} />
    </Suspense>
  );
}
