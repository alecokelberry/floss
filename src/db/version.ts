import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { dataVersion as versionRow } from "@/db/schema"

// data_version's one row, bumped by a trigger on every table (drizzle/0001_data_version.sql)
const read = async () =>
  (await db.select().from(versionRow).where(eq(versionRow.id, 1)))[0]

/**
 * A stamp that changes whenever anything is written to the clinic's database. Reads never change it, so staff pages
 * can ask for it every few seconds and re-render only after a real write, from any desk, phone or the seed.
 */
export async function dataVersion() {
  return String((await read())?.version ?? 0)
}
