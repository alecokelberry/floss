"use server"

import { and, eq, inArray, isNull, ne } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { clinicNow } from "@/db/clock"
import { getDirectory } from "@/db/queries/patients"
import { patients, practitioners } from "@/db/schema"
import { nextChart, patientInput, splitName } from "@/lib/patients"
import { authActionClient } from "@/lib/safe-action"

import { Refused, writeAndRefresh } from "./shared"

const byId = z.number().int()

/** New or Edit Patient's Save; a chart number belongs to one patient */
export const savePatient = authActionClient
  .inputSchema(
    z.object({ id: z.number().int().nullable(), input: patientInput })
  )
  .action(async ({ parsedInput: { id, input: p } }) => {
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [taken] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.chart, p.chart),
            id === null ? undefined : ne(patients.id, id)
          )
        )
      if (taken) throw new Refused(`${p.chart} is already someone's chart.`)
      const carrier = p.carrier || null
      const memberId = carrier ? p.memberId : null
      const fields = {
        ...splitName(p.name),
        chart: p.chart,
        phone: p.phone,
        email: p.email,
        practitionerId: p.practitionerId,
        stage: p.stage,
        carrier,
        memberId,
      }
      if (id === null) {
        await tx.insert(patients).values({ ...fields, createdAt: now })
        return `${p.name} is on the books as ${p.chart}.`
      }
      const [before] = await tx
        .select({ carrier: patients.carrier, memberId: patients.memberId })
        .from(patients)
        .where(eq(patients.id, id))
      if (!before) throw new Refused("That patient is gone.")
      // A new plan or card hasn't been checked with the carrier yet
      const replan = before.carrier !== carrier || before.memberId !== memberId
      await tx
        .update(patients)
        .set(replan ? { ...fields, verifiedOn: null } : fields)
        .where(eq(patients.id, id))
      return `${p.name} (${p.chart}) saved.`
    })
  })

/** Off the directory; their appointments stay on the diary */
export const removePatient = authActionClient
  .inputSchema(byId)
  .action(async ({ parsedInput: id }) => {
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [gone] = await tx
        .update(patients)
        .set({ removedAt: now })
        .where(and(eq(patients.id, id), isNull(patients.removedAt)))
        .returning({
          first: patients.firstName,
          last: patients.lastName,
          chart: patients.chart,
        })
      if (!gone) throw new Refused("That patient is gone.")
      return `${gone.first} ${gone.last} (${gone.chart}) is off the directory.`
    })
  })

/** Group actions' Assign practitioner: every selected patient now sees them */
export const assignPractitioner = authActionClient
  .inputSchema(
    z.object({ ids: z.array(z.number().int()), practitionerId: z.string() })
  )
  .action(async ({ parsedInput: { ids, practitionerId } }) =>
    writeAndRefresh(async (tx) => {
      const [who] = await tx
        .select({ name: practitioners.name })
        .from(practitioners)
        .where(eq(practitioners.id, practitionerId))
      if (!who) throw new Refused("Pick a practitioner.")
      await tx
        .update(patients)
        .set({ practitionerId })
        .where(inArray(patients.id, ids))
      return `${who.name} now sees ${ids.length} ${ids.length === 1 ? "patient" : "patients"}.`
    })
  )

/** A patient as their sheets show them, for a sheet opened from the grid or the Directory */
export const loadPatient = authActionClient
  .inputSchema(byId)
  .action(
    async ({ parsedInput: id }) =>
      (await getDirectory()).find((p) => p.id === id) ?? null
  )

/** The next chart number, for New Patient */
export const nextChartNumber = authActionClient.action(async () => {
  const rows = await db.select({ chart: patients.chart }).from(patients)
  return nextChart(rows.map((r) => r.chart))
})
