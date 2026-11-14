import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* postgres() connects on the first query, so `next build` works without a database.
   A missing DATABASE_URL shows up as a connection error at request time. */
const url = process.env.DATABASE_URL ?? "postgres://missing-DATABASE_URL@127.0.0.1:1/none";

/* Behind a transaction pooler (Neon's "-pooler" host, PgBouncer) prepared statements don't
   survive between queries, so they're off there. */
const pooled = /-pooler\./.test(url) || process.env.DB_PREPARE === "false";

/* One pool per server process. In development, keep it across hot reloads. */
const g = globalThis as unknown as { __bcSql?: ReturnType<typeof postgres>; __bcListen?: ReturnType<typeof postgres> };
const sql = g.__bcSql ?? postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 10), prepare: !pooled });
/* LISTEN needs a direct connection that stays open; a pooler can't hold one. Neon's integration
   provides it as DATABASE_URL_UNPOOLED; elsewhere the one URL is direct already. */
const listenUrl = process.env.DATABASE_URL_UNPOOLED ?? url;
const listener = g.__bcListen ?? (listenUrl === url ? sql : postgres(listenUrl, { max: 1 }));
if (process.env.NODE_ENV !== "production") {
  g.__bcSql = sql;
  g.__bcListen = listener;
}

export const db = drizzle(sql, { schema });
export { schema };
/** The raw postgres-js client for LISTEN (src/lib/order-feed.ts), on a direct connection. */
export const pg = listener;
