import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Server modules import "server-only", which throws outside React Server Components
      "server-only": fileURLToPath(
        new URL("node_modules/server-only/empty.js", import.meta.url)
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    environment: "node",
    // Migrates a template database once per run; each test file then gets its own copy (tests/database.ts)
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/database.ts"],
    // UTC, as on Vercel: dates are reckoned in the app's own zone whatever zone the server runs in
    env: { TZ: "UTC" },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
