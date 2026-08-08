import { randomUUID } from "node:crypto"

import { afterAll } from "vitest"

import { admin, SERVER } from "./test-server"

// Runs before each test file's imports: gives the file its own copy of the migrated template, so db/index.ts
// connects to it and files never see each other's rows.
const run = process.env.TEST_RUN
if (!run) throw new Error("TEST_RUN is unset: run the tests through vitest")

const name = `${run}_${randomUUID().replaceAll("-", "").slice(0, 12)}`
await admin(`create database ${name} template ${run}_template`)
process.env.DATABASE_URL = `${SERVER}/${name}`
process.env.BETTER_AUTH_SECRET ??= "test-secret-that-signs-nothing-real-0000"

afterAll(async () => {
  await globalThis.pool?.end()
})
