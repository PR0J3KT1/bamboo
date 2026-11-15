import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BedDouble, Utensils } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { listBookings, type BookingTab } from "@/db/queries/bookings";
import { bookingSummary, STATUS_LABEL, type BookingStatus } from "@/lib/bookings";
import { displayPhone } from "@/lib/phone";
import { requestTime } from "@/lib/clock";
import { NoAccess, Unassigned } from "@/components/admin-shell/no-access";
import { adminScope } from "@/lib/scope";
import { Tag } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Bookings" };

const TABS: { id: BookingTab; label: string; empty: string }[] = [
  { id: "requests", label: "Requests", empty: "No requests waiting. New ones from the Rooms and Book a table pages show up here." },
  { id: "upcoming", label: "Upcoming", empty: "No confirmed bookings ahead." },
  { id: "past", label: "Past and closed", empty: "Nothing here yet." },
];
const TONE: Record<BookingStatus, "ok" | "warn" | "danger" | "neutral" | "grove"> = { requested: "warn", confirmed: "ok", declined: "danger", cancelled: "neutral", completed: "neutral" };

function ago(d: Date, now: number) {
  const m = Math.floor((now - d.getTime()) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}

async function Bookings({ searchParams }: { searchParams: PageProps<"/admin/bookings">["searchParams"] }) {
  const { user, denied } = await checkPermission({ booking: ["view"] });
  if (denied) return <NoAccess reason={denied} path="/admin/bookings" />;
  const scope = await adminScope(user);
  if (scope.unassigned) return <Unassigned />;
  const everywhere = scope.locations.length > 1 && !scope.locationId;
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "requests") as BookingTab;
  const rows = await listBookings(tab, scope.locationId);
  const now = requestTime();

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 md:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-h2 font-extrabold uppercase">Bookings</h1>
        <p className="text-fine text-ink-2">Rooms and tables. Confirming or declining texts the customer.</p>
      </div>
      <nav aria-label="Which bookings" className="flex self-start rounded-full bg-ground p-1">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/bookings?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={cn("flex h-10 items-center rounded-full px-4 font-semibold", t.id === tab ? "bg-panel shadow-sm" : "text-ink-2 hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel p-6 text-ink-2">{TABS.find((t) => t.id === tab)!.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((b) => {
            const Icon = b.kind === "room" ? BedDouble : Utensils;
            return (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-panel p-4 hover:border-action">
                  <span className="flex size-11 items-center justify-center rounded-full bg-action-soft text-action"><Icon aria-hidden className="size-5" /></span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="figures text-[1.125rem]">{b.code}</span>
                      <span className="font-semibold">{bookingSummary(b)}</span>
                    </span>
                    <span className="block truncate text-fine text-ink-2">
                      {everywhere ? `${b.location}: ` : ""}{b.name}, {displayPhone(b.phone)}{b.occasion ? `, ${b.occasion.toLowerCase()}` : ""}{b.note ? `. “${b.note}”` : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Tag tone={TONE[b.status as BookingStatus]}>{STATUS_LABEL[b.status as BookingStatus]}</Tag>
                    <span className="text-fine text-ink-2">{ago(b.createdAt, now)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function BookingsPage(props: PageProps<"/admin/bookings">) {
  return (
    <Suspense fallback={<Loader label="Loading bookings" />}>
      <Bookings searchParams={props.searchParams} />
    </Suspense>
  );
}
