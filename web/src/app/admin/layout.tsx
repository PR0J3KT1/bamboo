import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { AdminBar, type AdminNavItem } from "@/components/admin-shell/admin-bar";
import { NoAccess } from "@/components/admin-shell/no-access";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Bamboo Cask admin" } };

async function Frame({ children }: { children: React.ReactNode }) {
  const { user, denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} />;

  const nav: AdminNavItem[] = [
    { href: "/admin", label: "Orders" },
    ...(can(user.role, { menu: ["toggle"] }) ? [{ href: "/admin/menu", label: "Menu" }] : []),
    /* Customers (phase 6) and Reports (phase 7) join here as they're built */
    ...(can(user.role, { user: ["set-role"] }) ? [{ href: "/admin/team", label: "Team" }] : []),
  ];
  return (
    <>
      <AdminBar nav={nav} who={user.name || user.phoneNumber || "Signed in"} />
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
