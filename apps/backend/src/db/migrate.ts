import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { databasePool, closeDatabasePools } from "./pool";

/** Explicit command, never run automatically when starting the application. */
export async function migrateDatabase(
  pool: Pool,
  directory = resolve(__dirname, "../../../../migrations"),
) {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock(1347374155)");
    locked = true;
    await client.query(`CREATE TABLE IF NOT EXISTS polka_schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM polka_schema_migrations",
    );
    const previous = new Map(applied.rows.map((r) => [r.name, r.checksum]));
    const files = (await readdir(directory))
      .filter((f) => /^\d+_[a-z0-9_]+\.sql$/.test(f))
      .sort();
    const done: string[] = [];
    for (const name of files) {
      const sql = await readFile(resolve(directory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      if (previous.has(name)) {
        if (previous.get(name) !== checksum)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO polka_schema_migrations (name, checksum) VALUES ($1, $2)",
          [name, checksum],
        );
        await client.query("COMMIT");
        done.push(name);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return done;
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock(1347374155)");
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  void (async () => {
    try {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URL is not configured");
      const names = await migrateDatabase(
        databasePool(process.env.DATABASE_URL),
      );
      console.log(`Database migrations applied: ${names.length}`);
    } catch {
      console.error(
        "Database migration failed. Check database access and migration files; existing migrations must not be edited.",
      );
      process.exitCode = 1;
    } finally {
      await closeDatabasePools();
    }
  })();
}
