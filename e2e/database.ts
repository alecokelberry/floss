// `pnpm exec tsx e2e/database.ts`: a fresh database for a browser-test run, migrated and seeded. The e2e web server
// runs it before it builds (playwright.config.ts), since Playwright starts that server before any global setup.
import { execFileSync } from "node:child_process"
import { basename } from "node:path"

import { admin, SERVER } from "../tests/test-server"

const name = `${basename(process.cwd()).replaceAll("-", "_")}_e2e`
await admin(
  `drop database if exists ${name} with (force)`,
  `create database ${name}`
)
const env = {
  ...process.env,
  DATABASE_URL: `${SERVER}/${name}`,
  DATABASE_URL_UNPOOLED: `${SERVER}/${name}`,
}
execFileSync("pnpm", ["exec", "drizzle-kit", "migrate"], { env, stdio: "pipe" })
execFileSync("pnpm", ["db:seed"], { env, stdio: "pipe" })
