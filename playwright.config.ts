import { readFileSync } from "node:fs"
import { basename } from "node:path"

import { defineConfig, devices } from "@playwright/test"

// Browser tests run against a production build on the dev port + 100 (:3001 → :3101), with its own database (<app>_e2e), recreated,
// migrated and seeded by e2e/database.ts before the build, so they never touch the dev server or its data.
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts
const PORT = Number(/-p (\d+)/.exec(scripts.dev)?.[1]) + 100
const DATABASE_URL = `postgresql://localhost:5432/${basename(process.cwd()).replaceAll("-", "_")}_e2e`
const STATE = "e2e/.auth/state.json"

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // Signs in once; every other test starts from the saved session
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STATE },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: STATE },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec tsx e2e/database.ts && pnpm build && pnpm exec next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          DATABASE_URL,
          // These win over .env.local, which Next also reads
          DATABASE_URL_UNPOOLED: DATABASE_URL,
          BETTER_AUTH_URL: `http://localhost:${PORT}`,
        },
      },
})
