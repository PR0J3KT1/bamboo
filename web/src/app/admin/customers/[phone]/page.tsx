import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getCustomer } from "@/db/queries/customers";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";
import { eighteenthBirthday } from "@/lib/age";
import { stepsFor } from "@/lib/order-status";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Tag } from "@/components/ui/pill";
import { formatKes } from "@/components/ui/price";
import { RoleSelect } from "../../team/team-forms";
import { AGE } from "../age-status";
import { BlockForm } from "./block-form";

export const metadata: Metadata = { title: "Customer" };

const date = (d: Date | string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
const card = "flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-4";

async function Customer({ params }: { params: Promise<{ phone: string }> }) {
  const { phone: raw } = await params;
  const { user: me, denied } = await checkPermission({ customer: ["view"] });
  if (denied) return <NoAccess reason={denied} path={`/admin/customers/${raw}`} />;
  const phone = normalizeKenyanPhone(raw);
  if (!phone) notFound();
  const c = await getCustomer(phone);
  if (!c) notFound();
  const isAdmin = can(me.role, { user: ["ban"] });
  const statusLabel = (mode: "delivery" | "collect", s: string) => (s === "cancelled" ? "Cancelled" : stepsFor(mode).find((x) => x.status === s)?.label ?? s);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5 md:px-5">
        <Link href="/admin/customers" className="-ml-2 flex h-10 items-center gap-1 rounded-full px-2 font-semibold"><ChevronLeft aria-hidden className="size-5" /> Customers</Link>
        <h1 className="font-display text-h3 font-extrabold uppercase">{c.name || displayPhone(phone)}</h1>
        {c.blocked ? <Tag tone="grove">Blocked</Tag> : <Tag tone={AGE[c.age].tone}>{AGE[c.age].label}</Tag>}
      </div>

      <main className="flex flex-wrap items-start gap-5 p-4 md:p-5">
        <div className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-3.5">
          <section className={card}>
            <div className="flex justify-between gap-3"><span className="text-ink-2">Phone</span><a href={`tel:${phone}`} className="font-semibold text-action underline">{displayPhone(phone)}</a></div>
            <div className="flex justify-between gap-3"><span className="text-ink-2">Account</span><span className="font-semibold">{c.user ? `Since ${date(c.user.createdAt)}` : "Guest, no account"}</span></div>
            {c.user && isAdmin && (
              <div className="flex justify-between gap-3"><span className="text-ink-2">Date of birth</span><span className="font-semibold">{c.user.dateOfBirth ? date(`${c.user.dateOfBirth}T12:00:00Z`) : "Not set yet"}</span></div>
            )}
            {isAdmin && c.age === "minor" && c.user?.dateOfBirth && (
              <div className="flex justify-between gap-3"><span className="text-ink-2">Cask Room opens</span><span className="font-semibold">{date(`${eighteenthBirthday(c.user.dateOfBirth)}T12:00:00Z`)}</span></div>
            )}
            {c.user && <p className="text-fine text-ink-2">The date of birth is set once by the customer and can&rsquo;t be changed here.</p>}
          </section>

          {isAdmin && (
            <section className={card}>
              <h2 className="font-bold">Access</h2>
              {c.user && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Role</span>
                  <RoleSelect userId={c.user.id} role={c.user.role} name={c.name ?? ""} self={c.user.id === me.id} />
                </div>
              )}
              {c.blocked && c.blockReason && <p className="rounded-xl bg-ground-2 p-2.5 text-fine">Blocked: {c.blockReason}</p>}
              {c.user?.id !== me.id && <BlockForm phone={phone} blocked={c.blocked} />}
            </section>
          )}
        </div>

        <section className="min-w-0 flex-[999_1_420px] overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3.5">
            <h2 className="font-bold">Orders</h2>
            <span className="text-ink-2">
              {c.orders.length === 1 ? "1 order" : `${c.orders.length} orders`}, <b className="text-ink">KES {formatKes(c.spent)}</b> completed
            </span>
          </div>
          <ul>
            {c.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-3 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <Link href={`/admin/orders/${o.id}`} className="font-bold text-action underline">{o.code}</Link>
                  <span className="text-fine text-ink-2">{o.lines}</span>
                </span>
                <span className="flex items-center gap-3.5">
                  <Tag tone={o.status === "cancelled" ? "danger" : o.status === "completed" ? "neutral" : "ok"}>{statusLabel(o.mode, o.status)}</Tag>
                  <span className="text-fine text-ink-2">{date(o.createdAt)}</span>
                  <span className="figures min-w-[70px] text-right text-[1.25rem]">{formatKes(o.total)}</span>
                </span>
              </li>
            ))}
            {c.orders.length === 0 && <li className="px-4 py-5 text-ink-2">No orders yet.</li>}
          </ul>
        </section>
      </main>
    </>
  );
}

export default function CustomerPage(props: PageProps<"/admin/customers/[phone]">) {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading…</p>}>
      <Customer params={props.params} />
    </Suspense>
  );
}
