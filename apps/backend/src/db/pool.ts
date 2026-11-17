import { Pool } from "pg";

const pools = new Map<string, Pool>();
export function databasePool(connectionString: string): Pool {
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // Do not log connection strings, SQL parameters or credentials.
    pool.on("error", () =>
      console.error("PostgreSQL idle connection unavailable"),
    );
    pools.set(connectionString, pool);
  }
  return pool;
}
export async function closeDatabasePools() {
  await Promise.all([...pools.values()].map((pool) => pool.end()));
  pools.clear();
}
