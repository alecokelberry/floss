// The Appointments page's reads: the practice's planner entries, and one entry for its sheet.
import "server-only"
import { asc, eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { tasks } from "@/db/schema"
import { requireUser } from "@/lib/session"

/** Every planner entry, by start (the practice keeps a few weeks of them) */
export const getTasks = cache(async () => {
  await requireUser()
  return db.select().from(tasks).orderBy(asc(tasks.startsAt), asc(tasks.id))
})
export type Task = Awaited<ReturnType<typeof getTasks>>[number]

export async function getTask(id: number) {
  await requireUser()
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
  return task ?? null
}
