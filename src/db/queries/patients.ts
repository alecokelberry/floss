// The Patients page's read: every patient on the directory with their practitioner, their bookings counted
// (upcoming, unpaid, total), the next treatment booked, the last thing the board logged about them, and their
// treatment plans, newest first.
import "server-only"
import { asc, isNull } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { patients } from "@/db/schema"
import { isHygiene } from "@/lib/recall"
import { requireUser } from "@/lib/session"

export const getDirectory = cache(async () => {
  await requireUser()
  const rows = await db.query.patients.findMany({
    where: isNull(patients.removedAt),
    orderBy: asc(patients.chart),
    with: {
      practitioner: { columns: { id: true, name: true } },
      bookings: {
        columns: { startsAt: true, status: true, procedureId: true },
        with: { procedure: { columns: { name: true } } },
        orderBy: (b) => [asc(b.startsAt)],
      },
      events: {
        columns: { at: true, kind: true, detail: true },
        with: { procedure: { columns: { name: true } } },
        orderBy: (e, { desc }) => [desc(e.at), desc(e.id)],
        limit: 1,
      },
      plans: {
        columns: { patientId: false },
        with: { practitioner: { columns: { id: true, name: true } } },
        orderBy: (t, { desc }) => [desc(t.presentedOn), desc(t.id)],
      },
    },
  })
  return rows.map(({ bookings, events, ...p }) => {
    const booked = bookings.filter((b) => b.status === "booked")
    return {
      ...p,
      name: `${p.firstName} ${p.lastName}`.trim(),
      upcoming: booked.length,
      unpaid: bookings.filter((b) => b.status === "unpaid").length,
      total: bookings.filter((b) => b.status !== "cancelled").length,
      nextTreatment: booked[0]?.procedure.name ?? null,
      nextHygiene:
        booked.find((b) => isHygiene(b.procedureId))?.startsAt ?? null,
      lastActivity: events[0]
        ? {
            at: events[0].at,
            kind: events[0].kind,
            line: `${events[0].procedure.name} · ${events[0].detail}`,
          }
        : null,
    }
  })
})
export type DirectoryPatient = Awaited<ReturnType<typeof getDirectory>>[number]
