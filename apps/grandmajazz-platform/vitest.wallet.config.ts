import { defineConfig } from "vitest/config";
import path from "node:path";

// Wallet adapter fixtures do not touch Postgres; keep them runnable before a
// dedicated TEST_DATABASE_URL has been provisioned.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/apple-wallet.test.ts", "tests/google-wallet.test.ts"],
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
});
