import "server-only";
import { sql } from "drizzle-orm";
import { db, pg } from "@/db";

/* Order changes, live. Anything that changes an order calls notifyOrder() inside its transaction;
   Postgres delivers the order id to every server process LISTENing on "orders" when the transaction
   commits. Each process keeps one listening connection (postgres-js reconnects it if it drops)
   and fans the ids out to the open event streams. */

type Listener = (orderId: string) => void;
const g = globalThis as unknown as { __bcFeed?: { listeners: Set<Listener>; started?: Promise<unknown> } };
const feed = (g.__bcFeed ??= { listeners: new Set() });

function start() {
  feed.started ??= pg.listen("orders", (id) => feed.listeners.forEach((l) => l(id))).catch((e) => {
    feed.started = undefined; // try again with the next stream
    throw e;
  });
  return feed.started;
}

export async function onOrderChange(listener: Listener): Promise<() => void> {
  feed.listeners.add(listener);
  await start();
  return () => feed.listeners.delete(listener);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function notifyOrder(tx: Tx | typeof db, orderId: string) {
  await tx.execute(sql`select pg_notify('orders', ${orderId})`);
}

/** A Server-Sent Events response: "event: order / data: <id>" for each change that passes
    `filter`, a comment every 25 s so proxies keep the connection open, and clean-up when the
    browser goes away. EventSource reconnects by itself if the connection drops. */
export function orderStream(req: Request, filter: (id: string) => boolean = () => true): Response {
  const enc = new TextEncoder();
  let stop: (() => void) | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          /* closed */
        }
      };
      send("retry: 3000\n\n");
      stop = await onOrderChange((id) => filter(id) && send(`event: order\ndata: ${id}\n\n`));
      beat = setInterval(() => send(": still here\n\n"), 25_000);
      req.signal.addEventListener("abort", () => {
        stop?.();
        clearInterval(beat);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      stop?.();
      clearInterval(beat);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
