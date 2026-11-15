import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { AdminBar, type AdminNavItem } from "@/components/admin-shell/admin-bar";
import { NoAccess } from "@/components/admin-shell/no-access";
import { countRequests } from "@/db/queries/bookings";
import { adminScope } from "@/lib/scope";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Bamboo Cask admin" } };

async function Frame({ children }: { children: React.ReactNode }) {
  const { user, denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} />;
  const scope = await adminScope(user);

  const nav: AdminNavItem[] = [
    { href: "/admin", label: "Orders" },
    ...(can(user.role, { menu: ["toggle"] }) ? [{ href: "/admin/menu", label: "Menu" }] : []),
    ...(can(user.role, { customer: ["view"] }) ? [{ href: "/admin/customers", label: "Customers" }] : []),
    ...(can(user.role, { booking: ["view"] }) ? [{ href: "/admin/bookings", label: "Bookings", count: await countRequests(scope.locationId) }] : []),
    ...(can(user.role, { report: ["view"] }) ? [{ href: "/admin/reports", label: "Reports" }] : []),
    ...(can(user.role, { team: ["assign"] }) ? [{ href: "/admin/team", label: "Team" }] : []),
    ...(can(user.role, { location: ["edit"] }) ? [{ href: "/admin/settings", label: "Settings" }] : []),
  ];
  return (
    <>
      <AdminBar
        nav={nav}
        who={user.name || user.phoneNumber || "Signed in"}
        place={{ current: scope.locationId, fixed: scope.fixed, locations: scope.locations.map((l) => ({ id: l.id, name: l.name })) }}
      />
      {children}
    </>
  );
}

/* Every page under /admin checks the role again itself, and so does every admin action. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground-2">
      <Suspense fallback={<div className="grove-bg h-15" />}>
        <Frame>{children}</Frame>
      </Suspense>
    </div>
  );
}
