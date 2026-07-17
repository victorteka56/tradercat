import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Supabase's transaction pooler (6543) does not support prepared statements.
// Reuse the client across hot reloads so dev doesn't exhaust the pool.
const globalForDb = globalThis as unknown as {
  __tradercatSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__tradercatSql ??
  postgres(env.DATABASE_URL, { prepare: false, max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.__tradercatSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
