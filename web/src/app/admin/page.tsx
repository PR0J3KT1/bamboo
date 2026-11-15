import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { getBoard } from "@/db/queries/orders";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Board } from "./board";
import { requestTime } from "@/lib/clock";
import { Loader } from "@/components/ui/loader";
import { adminScope } from "@/lib/scope";
import { Unassigned } from "@/components/admin-shell/no-access";

export const metadata: Metadata = { title: "Orders" };

async function BoardData() {
  const { user, denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} />;
  const scope = await adminScope(user);
  if (scope.unassigned) return <Unassigned />;
  const board = await getBoard(scope.locationId);
  return <Board {...board} serverNow={requestTime()} where={scope.locations.length > 1 ? (scope.location?.name ?? null) : ""} />;
}

export default function AdminHome() {
  return (
    <Suspense fallback={<Loader label="Loading orders" />}>
      <BoardData />
    </Suspense>
  );
}
