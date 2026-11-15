import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkPermission } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { NoAccess, Unassigned } from "@/components/admin-shell/no-access";
import { getLocations } from "@/lib/locations";
import { AddToTeam, MemberControls, type Grant } from "./team-forms";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Team" };

const ROLE_PHRASE: Record<string, string> = { admin: "an admin", manager: "a manager", staff: "staff", customer: "a customer" };

const WHAT = {
  staff: "Staff see and move their location's orders and bookings, and mark dishes sold out.",
  manager: "Managers also set their location's prices, hours and phone, read its reports, and add its staff.",
  admin: "Admins run every location: the shared menu, new locations, roles, blocked numbers and the brand's settings.",
};

async function Team() {
  const { user: me, denied } = await checkPermission({ team: ["assign"] });
  if (denied) return <NoAccess reason={denied} path="/admin/team" />;
  const isAdmin = me.role === "admin";
  if (!isAdmin && !me.locationId) return <Unassigned />;

  const locations = await getLocations();
  const name = new Map(locations.map((l) => [l.id, l.name]));
  const [team, changes] = await Promise.all([
    db
      .select()
      .from(schema.user)
      .where(isAdmin ? inArray(schema.user.role, ["admin", "manager", "staff"]) : and(inArray(schema.user.role, ["manager", "staff"]), eq(schema.user.locationId, me.locationId!)))
      .orderBy(asc(schema.user.locationId), asc(schema.user.role), asc(schema.user.name)),
    isAdmin
      ? db
          .select({ e: schema.auditEvents, who: schema.user.name, phone: schema.user.phoneNumber })
          .from(schema.auditEvents)
          .leftJoin(schema.user, eq(schema.auditEvents.entityId, schema.user.id))
          .where(eq(schema.auditEvents.action, "role.set"))
          .orderBy(desc(schema.auditEvents.createdAt))
          .limit(10)
      : Promise.resolve([]),
  ]);
  const grant: Grant = isAdmin
    ? { roles: ["staff", "manager", "admin"], locations: locations.map((l) => ({ id: l.id, name: l.name })), ownLocation: null }
    : { roles: ["staff"], locations: [], ownLocation: me.locationId };
  const multi = locations.length > 1;

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 md:px-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-extrabold uppercase">{isAdmin || !multi ? "Team" : `Team, ${name.get(me.locationId!)}`}</h1>
        <p className="text-ink-2">{WHAT.staff} {WHAT.manager} {isAdmin && WHAT.admin}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <h2 className="font-bold">Add someone</h2>
        <p className="text-fine text-ink-2">They sign in on the site with their own number first; then add that number here.</p>
        <AddToTeam grant={grant} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <ul>
          {team.map((u) => {
            /* a manager can change their staff, not themselves or another manager */
            const mine = isAdmin || u.role === "staff";
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-3 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{u.name || "Name not set"}</span>
                  <span className="text-fine text-ink-2">
                    {u.phoneNumber ? displayPhone(u.phoneNumber) : ""}
                    {multi && isAdmin ? (u.role === "admin" ? ", every location" : `, ${u.locationId ? (name.get(u.locationId) ?? "a closed location") : "no location yet"}`) : ""}
                  </span>
                </span>
                {mine ? (
                  <MemberControls userId={u.id} role={u.role} locationId={u.locationId} name={u.name || u.phoneNumber || ""} self={u.id === me.id} grant={grant} />
                ) : (
                  <span className="text-ink-2">{u.role === "manager" ? "Manager" : u.role}{u.id === me.id ? " (you)" : ""}</span>
                )}
              </li>
            );
          })}
          {team.length === 0 && <li className="px-4 py-5 text-ink-2">Nobody here yet.</li>}
        </ul>
      </section>

      {changes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Recent changes</h2>
          <ul className="flex flex-col gap-1 text-body text-ink-2">
            {changes.map(({ e, who, phone }) => {
              const after = e.after as { role: string; locationId?: string | null };
              return (
                <li key={e.id}>
                  {e.createdAt.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Nairobi" })}:{" "}
                  {e.actorName} made {who || (phone ? displayPhone(phone) : "an account")} {ROLE_PHRASE[after.role] ?? after.role}
                  {multi && after.locationId ? ` at ${name.get(after.locationId) ?? "a closed location"}` : ""}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<Loader label="Loading the team" />}>
      <Team />
    </Suspense>
  );
}
