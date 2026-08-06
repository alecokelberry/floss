import { existsSync } from "node:fs"

import { defineConfig } from "drizzle-kit"

import { databaseUrl } from "./src/db/database-url"

// drizzle-kit runs outside Next, so it loads .env.local itself (a variable already set wins)
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Migrations run over the direct connection: a transaction pooler can't run them
  dbCredentials: { url: databaseUrl({ direct: true }) },
  strict: true,
  verbose: true,
})
