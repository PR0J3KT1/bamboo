import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { orderStream } from "@/lib/order-feed";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Changes to one order, for its tracking page. Whoever has the order's random id may follow it,
   as with the page itself; the stream only ever says "this order changed", never what. */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[id]/stream">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const [o] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  if (!o) return new Response("Not found", { status: 404 });
  return orderStream(req, (changed) => changed === id);
}
