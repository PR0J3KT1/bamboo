import { NotAllowed, requirePermission } from "@/lib/session";
import { orderStream } from "@/lib/order-feed";

/* Every order change, for the orders board. Staff only. */
export async function GET(req: Request) {
  try {
    await requirePermission({ order: ["view"] });
  } catch (e) {
    if (e instanceof NotAllowed) return new Response("Not allowed", { status: e.reason === "signed-out" ? 401 : 403 });
    throw e;
  }
  return orderStream(req);
}
