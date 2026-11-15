import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getAdminMenu } from "@/db/queries/admin-menu";
import { NoAccess, Unassigned } from "@/components/admin-shell/no-access";
import { adminScope, oneLocation } from "@/lib/scope";
import { MenuAdmin } from "./menu-admin";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Menu and prices" };

async function Menu() {
  const { user, denied } = await checkPermission({ menu: ["toggle"] });
  if (denied) return <NoAccess reason={denied} path="/admin/menu" />;
  const scope = await adminScope(user);
  const location = oneLocation(scope);
  if (!location) return <Unassigned />;
  const data = await getAdminMenu(location.id);
  return (
    <MenuAdmin
      key={location.id}
      data={data}
      location={{ id: location.id, name: location.name }}
      /* an admin looking at every location edits the first one's prices; the bar picks another */
      picked={scope.locations.length < 2 ? null : scope.location ? "one" : "all"}
      canPrice={can(user.role, { menu: ["price"] })}
      canEdit={can(user.role, { menu: ["edit"] })}
    />
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<Loader label="Loading the menu" />}>
      <Menu />
    </Suspense>
  );
}
