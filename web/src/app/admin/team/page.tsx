import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { NoAccess } from "@/components/admin-shell/no-access";
import { AddToTeam, RoleSelect } from "./team-forms";

export const metadata: Metadata = { title: "Team" };

const ROLE_PHRASE: Record<string, string> = { admin: "an admin", staff: "staff", customer: "a customer" };

const WHAT = {
  staff: "Staff see and move orders, and mark dishes sold out.",
  admin: "Admins also change prices and items, manage the team, block numbers and read the reports.",
};

async function Team() {
  const { user: me, denied } = await checkPermission({ user: ["set-role"] });
  if (denied) return <NoAccess reason={denied} path="/admin/team" />;

  const [team, changes] = await Promise.all([
    db.select().from(schema.user).where(inArray(schema.user.role, ["admin", "staff"])).orderBy(asc(schema.user.role), asc(schema.user.name)),
    db
      .select({ e: schema.auditEvents, who: schema.user.name, phone: schema.user.phoneNumber })
      .from(schema.auditEvents)
      .leftJoin(schema.user, eq(schema.auditEvents.entityId, schema.user.id))
      .where(eq(schema.auditEvents.action, "role.set"))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(10),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 md:px-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-extrabold uppercase">Team</h1>
        <p className="text-ink-2">{WHAT.staff} {WHAT.admin}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <h2 className="font-bold">Add someone</h2>
        <p className="text-fine text-ink-2">They sign in on the site with their own number first; then add that number here.</p>
        <AddToTeam />
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <ul>
          {team.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-3 last:border-0">
              <span className="flex flex-col">
                <span className="font-semibold">{u.name || "Name not set"}</span>
                <span className="text-fine text-ink-2">{u.phoneNumber ? displayPhone(u.phoneNumber) : ""}</span>
              </span>
              <RoleSelect userId={u.id} role={u.role} name={u.name || u.phoneNumber || ""} self={u.id === me.id} />
            </li>
          ))}
        </ul>
      </section>

      {changes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Recent changes</h2>
          <ul className="flex flex-col gap-1 text-body text-ink-2">
            {changes.map(({ e, who, phone }) => (
              <li key={e.id}>
                {e.createdAt.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" })}:{" "}
                {e.actorName} made {who || (phone ? displayPhone(phone) : "an account")} {ROLE_PHRASE[(e.after as { role: string }).role] ?? (e.after as { role: string }).role}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading the team…</p>}>
      <Team />
    </Suspense>
  );
}
