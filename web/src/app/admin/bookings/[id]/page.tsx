import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getBooking } from "@/db/queries/bookings";
import { worksAt } from "@/lib/scope";
import { bookingSummary, STATUS_LABEL, type BookingStatus } from "@/lib/bookings";
import { ROOMS } from "@/lib/rooms";
import { displayPhone } from "@/lib/phone";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Tag } from "@/components/ui/pill";
import { BookingActions } from "./booking-actions";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Booking" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const card = "flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4";
const when = (d: Date) => d.toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi" });

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: me, denied } = await checkPermission({ booking: ["view"] });
  if (denied) return <NoAccess reason={denied} path={`/admin/bookings/${id}`} />;
  if (!UUID.test(id)) notFound();
  const d = await getBooking(id);
  if (!d) notFound();
  if (!worksAt(me, d.b.locationId)) return <NoAccess reason="forbidden" path={`/admin/bookings/${id}`} />;
  const { b, others } = d;
  const status = b.status as BookingStatus;
  const total = b.kind === "room" && b.rate && b.nights ? b.rate * b.nights : null;
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4"><span className="text-ink-2">{k}</span><span className="text-right">{v}</span></div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5 md:px-5">
        <Link href="/admin/bookings" className="-ml-2 flex h-10 items-center gap-1 rounded-full px-2 font-semibold"><ChevronLeft aria-hidden className="size-5" /> Bookings</Link>
        <h1 className="figures text-h3">{b.code}</h1>
        <Tag tone={status === "requested" ? "warn" : status === "confirmed" ? "ok" : status === "declined" ? "danger" : "neutral"}>{STATUS_LABEL[status]}</Tag>
      </div>
      <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-[1000px] gap-5 p-4 md:grid-cols-[minmax(0,1fr)_340px] md:p-5">
        <div className="flex flex-col gap-4">
          <section className={card} aria-label="The booking">
            <h2 className="font-display text-[1.5rem] font-extrabold uppercase">{b.kind === "room" ? "Room" : "Table"}</h2>
            <p className="text-[1.0625rem] font-semibold">{bookingSummary(b)}</p>
            {b.kind === "room" && row("Room", ROOMS.find((r) => r.id === b.room)?.name ?? b.room)}
            {b.kind === "room" && row("Rate asked at", b.rate ? `KES ${b.rate.toLocaleString("en-KE")} a night` : "On request")}
            {total && row("Comes to", <span className="figures text-[1.25rem]">KES {total.toLocaleString("en-KE")}</span>)}
            {b.occasion && row("Occasion", b.occasion)}
            {b.note && row("Their note", `“${b.note}”`)}
            {row("Asked", when(b.createdAt))}
          </section>
          <section className={card} aria-label="Who">
            <h2 className="font-display text-[1.5rem] font-extrabold uppercase">Who</h2>
            {row("Name", b.name)}
            {row("Phone", <a href={`tel:${b.phone}`} className="font-semibold text-action underline">{displayPhone(b.phone)}</a>)}
            {row("Account", b.userId ? "Signed in" : "Guest")}
            {can(me.role, { customer: ["view"] }) && <Link href={`/admin/customers/${b.phone.slice(1)}`} className="self-start font-semibold text-action underline">Their orders and bookings</Link>}
            {others.length > 0 && (
              <p className="text-fine text-ink-2">
                Other bookings: {others.map((o, i) => <span key={o.id}>{i ? ", " : ""}<Link href={`/admin/bookings/${o.id}`} className="underline">{o.code}</Link> ({STATUS_LABEL[o.status as BookingStatus].toLowerCase()})</span>)}
              </p>
            )}
          </section>
          {(b.reply || b.handledBy) && (
            <section className={card} aria-label="Reply">
              {b.reply && row("Reply sent", `“${b.reply}”`)}
              {b.handledBy && row("Handled by", b.handledBy)}
              {row("Last change", when(b.updatedAt))}
            </section>
          )}
        </div>
        {can(me.role, { booking: ["update"] }) && <BookingActions id={b.id} code={b.code} status={status} kind={b.kind} />}
      </main>
    </>
  );
}

export default function BookingPage(props: PageProps<"/admin/bookings/[id]">) {
  return (
    <Suspense fallback={<Loader label="Loading the booking" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
