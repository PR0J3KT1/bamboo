import type { Metadata } from "next";
import { Suspense } from "react";
import { checkPermission } from "@/lib/session";
import { getBoard } from "@/db/queries/orders";
import { NoAccess } from "@/components/admin-shell/no-access";
import { Board } from "./board";
import { requestTime } from "@/lib/clock";

export const metadata: Metadata = { title: "Orders" };

async function BoardData() {
  const { denied } = await checkPermission({ order: ["view"] });
  if (denied) return <NoAccess reason={denied} />;
  const board = await getBoard();
  return <Board {...board} serverNow={requestTime()} />;
}

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="p-5 text-ink-2">Loading orders…</p>}>
      <BoardData />
    </Suspense>
  );
}
