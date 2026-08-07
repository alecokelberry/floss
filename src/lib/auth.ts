// Staff sign-in with Better Auth 1.7: email and password against Postgres, sessions in the database, no sign-up
// (staff accounts come from the seed, as a clinic would provision them). Patients never sign in.
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db } from "@/db"
import { authSchema } from "@/db/schema"
import { env } from "@/lib/env"

/** Where sign-in may be served from: `pnpm dev` on :3001 (this Mac and phones on its Wi-Fi), the browser tests' build on :3101 */
const HOSTS = [
  ...["localhost", "*.local", "192.168.*.*", "10.*.*.*"].flatMap((host) => [
    `${host}:3001`,
    `${host}:3101`,
  ]),
  // Vercel's system variables: this deployment, its branch and the production domain
  ...[
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    env.BETTER_AUTH_URL && new URL(env.BETTER_AUTH_URL).host,
  ].filter((host): host is string => Boolean(host)),
]

export const auth = betterAuth({
  appName: "Floss",
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  // A clinic shift, not a week: sign in again the next morning. The signed cookie cache answers `requireUser()`
  // for 5 minutes without a database read (every query, action and live-refresh poll asks); a session revoked
  // elsewhere can outlive that by up to 5 minutes, and signing out clears it at once.
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
    cookieCache: { enabled: true, maxAge: 60 * 5, strategy: "compact" },
  },
  // The base URL follows the request's host, from this list only: the dev server on this Mac and phones on its Wi-Fi
  // (next.config.ts), and on Vercel the deployment's own URLs plus any custom domain.
  baseURL: {
    allowedHosts: HOSTS,
    protocol: "auto",
    fallback: env.BETTER_AUTH_URL ?? "http://localhost:3001",
  },
  trustedOrigins: HOSTS.map((host) =>
    /:3[01]01$/.test(host) ? `http://${host}` : `https://${host}`
  ),
  // Keyed by IP, and a clinic's workstations share one: 20 a minute survives a shift change and still stops
  // guessing (it replaces Better Auth's default of 3 per 10 seconds for sign-in)
  rateLimit: {
    enabled: true,
    customRules: { "/sign-in/email": { window: 60, max: 20 } },
  },
  telemetry: { enabled: false },
  // Server actions that sign in or out set their cookies through Next
  plugins: [nextCookies()],
})
