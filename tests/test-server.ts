import { Client } from "pg"

/** The Postgres server tests create their databases on: Postgres.app locally, a service container in CI */
export const SERVER =
  process.env.TEST_DATABASE_SERVER ?? "postgresql://localhost:5432"

/** Runs statements against the server's maintenance database (CREATE/DROP DATABASE can't run in a pool) */
export async function admin(...statements: string[]) {
  const client = new Client({ connectionString: `${SERVER}/postgres` })
  await client.connect()
  try {
    // In order, one at a time: a DROP must finish before the CREATE that reuses its name
    // oxlint-disable-next-line no-await-in-loop
    for (const statement of statements) await client.query(statement)
  } finally {
    await client.end()
  }
}
