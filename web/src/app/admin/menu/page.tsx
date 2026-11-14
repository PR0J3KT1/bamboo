import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getAdminMenu } from "@/db/queries/admin-menu";
import { NoAccess } from "@/components/admin-shell/no-access";
import { MenuAdmin } from "./menu-admin";

export const metadata: Metadata = { title: "Menu and prices" };

async function Menu() {
  const { user, denied } = await checkPermission({ menu: ["toggle"] });
  if (denied) return <NoAccess reason={denied} path="/admin/menu" />;
  const data = await getAdminMenu();
  return <MenuAdmin data={data} canEdit={can(user.role, { menu: ["edit"] })} />;
}

export default function MenuPage() {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading the menu…</p>}>
      <Menu />
    </Suspense>
  );
}
