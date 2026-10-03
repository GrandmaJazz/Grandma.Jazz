import { defineConfig } from "drizzle-kit";

// Migrations config for the EVENTS module only. The legacy family-wall table
// (shared/schema.ts) is intentionally excluded so generated migrations never
// touch it. Run: npm run db:generate / npm run db:migrate
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/events-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: "ev_drizzle_migrations",
  },
});
