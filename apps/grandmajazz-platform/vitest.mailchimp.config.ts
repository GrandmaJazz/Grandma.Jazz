import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["tests/mailchimp-admission.test.ts", "tests/mailchimp-adapter.test.ts", "tests/family-welcome-identity.test.ts", "tests/family-marketing-choice.test.ts", "tests/family-email-identity.test.ts"] } });
