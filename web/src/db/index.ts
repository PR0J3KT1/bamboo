import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* postgres() connects on the first query, so `next build` works without a database.
   A missing DATABASE_URL shows up as a connection error at request time. */
const url = process.env.DATABASE_URL ?? "postgres://missing-DATABASE_URL@127.0.0.1:1/none";

/* One pool per server process. In development, keep it across hot reloads. */
const g = globalThis as unknown as { __bcSql?: ReturnType<typeof postgres> };
const sql = g.__bcSql ?? postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 10) });
if (process.env.NODE_ENV !== "production") g.__bcSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
