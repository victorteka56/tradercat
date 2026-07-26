import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit-test config. We test the pure, deterministic core — trade reconstruction,
 * analytics, excursion/fills math — which needs no DB, network, or React. The
 * `@/` alias mirrors tsconfig so tests import modules exactly as the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "drizzle"],
  },
});
