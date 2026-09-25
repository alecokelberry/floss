"use server"

import { and, eq, isNotNull } from "drizzle-orm"
import { z } from "zod"

import { clinicNow } from "@/db/clock"
import { patients, treatmentPlans } from "@/db/schema"
import { isoDay } from "@/lib/dates"
import { authActionClient } from "@/lib/safe-action"

import { Refused, writeAndRefresh } from "./shared"

/** Verify: the desk has called the carrier and the benefits hold, as of today */
export const verifyInsurance = authActionClient
  .inputSchema(z.number().int())
  .action(async ({ parsedInput: id }) => {
    const today = isoDay(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [done] = await tx
        .update(patients)
        .set({ verifiedOn: today })
        .where(and(eq(patients.id, id), isNotNull(patients.carrier)))
        .returning({
          first: patients.firstName,
          last: patients.lastName,
          carrier: patients.carrier,
        })
      if (!done) throw new Refused("There's no plan on file to verify.")
      return `${done.first} ${done.last}'s ${done.carrier} benefits are verified.`
    })
  })

/** Accept or Decline on a proposed plan: the patient's answer, dated today */
export const decidePlan = authActionClient
  .inputSchema(
    z.object({
      id: z.number().int(),
      status: z.enum(["accepted", "declined"]),
    })
  )
  .action(async ({ parsedInput: { id, status } }) => {
    const today = isoDay(await clinicNow())
    return writeAndRefresh(async (tx) => {
      const [done] = await tx
        .update(treatmentPlans)
        .set({ status, decidedOn: today })
        .where(
          and(eq(treatmentPlans.id, id), eq(treatmentPlans.status, "proposed"))
        )
        .returning({ id: treatmentPlans.id })
      if (!done) throw new Refused("That plan has already been decided.")
      return status === "accepted"
        ? "Plan accepted. Book the first visit when they're ready."
        : "Plan declined. It stays on their chart."
    })
  })
