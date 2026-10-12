import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["tests/garments.test.ts", "tests/garments-layout.test.ts", "tests/garments-runtime.test.ts"] } });
