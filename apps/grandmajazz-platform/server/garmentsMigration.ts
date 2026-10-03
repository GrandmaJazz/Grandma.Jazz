import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

export async function migrateGarments(pool: Pool, directory = path.resolve("migrations/garments")) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7612904)");
    await client.query("CREATE TABLE IF NOT EXISTS gj_garments_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    if (!(await client.query("SELECT 1 FROM gj_garments_migrations WHERE version='0001_editor'")).rowCount) {
      await client.query(await readFile(path.join(directory, "0001_editor.sql"), "utf8"));
      await client.query("INSERT INTO gj_garments_migrations(version) VALUES('0001_editor')");
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
