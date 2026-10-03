import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Applies versioned SQL migrations from ./migrations (events module).
// Additive-only by policy; safe to run repeatedly (tracks applied migrations
// in ev_drizzle_migrations).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  await migrate(db, {
    migrationsFolder: "./migrations",
    migrationsTable: "ev_drizzle_migrations",
  });
  await pool.end();
  console.log("[migrate] all migrations applied");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
