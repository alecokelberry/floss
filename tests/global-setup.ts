import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { basename } from "node:path"

import { admin, SERVER } from "./test-server"

// One migrated template per run, named by run so parallel runs (worktrees, agents) never collide. Each test
// file copies it (tests/database.ts), which is a file copy and takes milliseconds. The run drops its own at the end.
export default async function setup() {
  const app = basename(process.cwd()).replaceAll("-", "_")
  const run = `${app}_test_${randomUUID().slice(0, 8)}`
  process.env.TEST_RUN = run
  await admin(`create database ${run}_template`)
  execFileSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
    env: {
      ...process.env,
      DATABASE_URL: `${SERVER}/${run}_template`,
      DATABASE_URL_UNPOOLED: `${SERVER}/${run}_template`,
    },
    stdio: "pipe",
  })

  return async () => {
    const { Client } = await import("pg")
    const client = new Client({ connectionString: `${SERVER}/postgres` })
    await client.connect()
    const { rows } = await client.query<{ datname: string }>(
      "select datname from pg_database where datname like $1",
      [`${run}_%`]
    )
    await client.end()
    await admin(
      ...rows.map(
        ({ datname }) => `drop database if exists ${datname} with (force)`
      )
    )
  }
}
