import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { checkPermission } from "@/lib/session";
import { listCustomers } from "@/db/queries/customers";
import { AGE } from "./age-status";
import { displayPhone } from "@/lib/phone";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Tag } from "@/components/ui/pill";
import { formatKes } from "@/components/ui/price";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

const when = (d: Date | null) =>
  d ? d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" }) : "No orders yet";

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const { denied } = await checkPermission({ customer: ["view"] });
  if (denied) return <NoAccess reason={denied} path="/admin/customers" />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const team = sp.team === "1";
  const rows = await listCustomers({ q, team });

  const tab = (on: boolean) => cn("flex h-10 items-center rounded-full px-4 font-semibold", on ? "bg-panel shadow-sm" : "text-ink-2");
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-3.5 px-4 py-5 md:px-5">
      <h1 className="font-display text-h2 font-extrabold uppercase">Customers</h1>
      <div className="flex flex-wrap items-center gap-2.5">
        <nav aria-label="Who to show" className="flex rounded-full bg-ground p-1">
          <Link href="/admin/customers" aria-current={!team ? "page" : undefined} className={tab(!team)}>Customers</Link>
          <Link href="/admin/customers?team=1" aria-current={team ? "page" : undefined} className={tab(team)}>Staff</Link>
        </nav>
        <form className="flex h-12 min-w-60 flex-[1_1_260px] items-center gap-2 rounded-full border-[1.5px] border-line bg-panel px-4 md:max-w-md">
          <Search aria-hidden className="size-4 text-ink-2" />
          {team && <input type="hidden" name="team" value="1" />}
          <label htmlFor="cq" className="sr-only">Phone number or name</label>
          <input id="cq" name="q" type="search" defaultValue={q} placeholder="Phone number or name" className="flex-1 bg-transparent outline-none" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="text-fine font-semibold text-ink-2">
              <th scope="col" className="border-b border-line px-4 py-3">Customer</th>
              <th scope="col" className="border-b border-line px-4 py-3">Cask Room</th>
              <th scope="col" className="border-b border-line px-4 py-3 text-right">Orders</th>
              <th scope="col" className="border-b border-line px-4 py-3 text-right">Spent, KES</th>
              <th scope="col" className="border-b border-line px-4 py-3">Last order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.phone} className="border-b border-line-2 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${r.phone.slice(1)}`} className="flex flex-col">
                    <span className="font-bold">{r.name || displayPhone(r.phone)}{r.role === "admin" || r.role === "staff" ? <span className="font-normal text-ink-2"> ({r.role})</span> : null}</span>
                    <span className="text-fine text-ink-2">{displayPhone(r.phone)}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    {r.blocked ? <Tag tone="grove">Blocked</Tag> : <Tag tone={AGE[r.age].tone}>{AGE[r.age].label}</Tag>}
                  </span>
                </td>
                <td className="figures px-4 py-3 text-right text-[1.25rem]">{r.orders}</td>
                <td className="figures px-4 py-3 text-right text-[1.25rem]">{formatKes(r.spent)}</td>
                <td className="px-4 py-3">{when(r.lastOrder)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-ink-2">{q ? `Nobody matches "${q}".` : team ? "Nobody on the team yet." : "No customers yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length === 200 && <p className="text-fine text-ink-2">Showing the 200 most recent. Search to find someone else.</p>}
    </main>
  );
}

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading customers…</p>}>
      <Customers searchParams={props.searchParams} />
    </Suspense>
  );
}
