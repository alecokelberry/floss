import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Relative, not @/: next.config.ts loads this file before path aliases exist
import { LOCAL_DATABASE_URL } from "../db/database-url"

/** On Vercel the database must be configured; anywhere else (dev, local builds, tests) it defaults to Postgres.app */
const onVercel = Boolean(process.env.VERCEL)

/**
 * Every environment variable the app reads, checked once at startup (next.config.ts imports this file).
 * Server values never reach the browser; a client value must start with NEXT_PUBLIC_ and be listed under `client`.
 */
export const env = createEnv({
  server: {
    // Neon's Vercel integration sets both: the pooled URL for the app, the direct one for migrations
    DATABASE_URL: onVercel ? z.url() : z.url().default(LOCAL_DATABASE_URL),
    DATABASE_URL_UNPOOLED: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    /** The public origin, when it's a custom domain rather than the deployment's own *.vercel.app */
    BETTER_AUTH_URL: z.url().optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
})
