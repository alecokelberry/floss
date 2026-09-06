"use server"

import { randomUUID } from "node:crypto"

import { and, eq, gte, inArray, lt, max } from "drizzle-orm"
import { z } from "zod"

import { clinicNow } from "@/db/clock"
import { getLedger } from "@/db/queries/payments"
import { bookingEvents, bookings, patients, procedures } from "@/db/schema"
import { atTime } from "@/lib/bookings"
import { addMinutes, clock, endOfDay, startOfDay } from "@/lib/dates"
import { money, nextNumber, wizardTotals } from "@/lib/invoices"
import { authActionClient } from "@/lib/safe-action"

import { nextSeq, Refused, writeAndRefresh } from "./shared"

const byKey = z.string()

/** An invoice for its sheet, by its bill key */
export const loadInvoice = authActionClient
  .inputSchema(byKey)
  .action(
    async ({ parsedInput: key }) =>
      (await getLedger()).find((i) => i.key === key) ?? null
  )

async function billOf(key: string) {
  const invoice = (await getLedger()).find((i) => i.key === key)
  if (!invoice) throw new Refused("That invoice is gone.")
  return invoice
}

/** Edit invoice's Save changes: each line's fee, and whether the money is in (the bookings follow: Completed or Unpaid) */
export const saveInvoice = authActionClient
  .inputSchema(
    z.object({
      key: z.string(),
      input: z.object({
        fees: z.array(
          z.object({ bookingId: z.number().int(), fee: z.number().min(0) })
        ),
        settled: z.boolean(),
      }),
    })
  )
  .action(async ({ parsedInput: { key, input } }) => {
    const invoice = await billOf(key)
    const now = new Date(await clinicNow())
    const status = input.settled ? "completed" : "unpaid"
    return writeAndRefresh(async (tx) => {
      let total = 0
      for (const line of invoice.lines) {
        const fee =
          input.fees.find((f) => f.bookingId === line.id)?.fee ?? line.fee
        total += fee ?? line.procedure.price
        await tx
          .update(bookings)
          .set({ status, fee })
          .where(eq(bookings.id, line.id))
        if (line.status !== status)
          await tx.insert(bookingEvents).values({
            bookingId: line.id,
            patientId: line.patient.id,
            practitionerId: line.practitioner.id,
            procedureId: line.procedure.id,
            kind: "status",
            detail: input.settled ? "Marked Completed" : "Marked Unpaid",
            at: now,
          })
      }
      return `${invoice.number} is now ${money(total)}, ${input.settled ? "settled" : "outstanding"}.`
    })
  })

/** Delete invoice: the bill and the treatment it billed come off the books and the diary */
export const deleteInvoice = authActionClient
  .inputSchema(byKey)
  .action(async ({ parsedInput: key }) => {
    const invoice = await billOf(key)
    const now = new Date(await clinicNow())
    return writeAndRefresh(async (tx) => {
      await tx.delete(bookings).where(
        inArray(
          bookings.id,
          invoice.lines.map((l) => l.id)
        )
      )
      for (const line of invoice.lines)
        await tx.insert(bookingEvents).values({
          bookingId: null,
          patientId: line.patient.id,
          practitionerId: line.practitioner.id,
          procedureId: line.procedure.id,
          kind: "cancelled",
          detail: "Invoice deleted",
          at: now,
        })
      return `${invoice.number} and the treatment it billed are off the books.`
    })
  })

const raiseInput = z.object({
  patientId: z.number({ error: "Select a patient" }).int().positive(),
  /** "yyyy-MM-dd" */
  issued: z.iso.date(),
  discount: z.number().min(0).max(100),
  lines: z
    .array(
      z.object({
        procedureId: z.string(),
        qty: z.number().int().min(1),
        rate: z.number().min(0),
        tax: z.number().min(0),
      })
    )
    .min(1),
})

/**
 * Send invoice: each line becomes an Unpaid booking for the patient's own clinician on the issue date, back to back
 * from the end of their day's last booking (9:00 when they have none), sharing one bill; the fees add up to the total.
 */
export const raiseInvoice = authActionClient
  .inputSchema(raiseInput)
  .action(async ({ parsedInput: r }) => {
    const now = new Date(await clinicNow())
    const bill = randomUUID()
    const totals = wizardTotals(r.lines, r.discount)
    const result = await writeAndRefresh(async (tx) => {
      const [patient] = await tx
        .select()
        .from(patients)
        .where(eq(patients.id, r.patientId))
      if (!patient?.practitionerId)
        throw new Refused("That patient has no clinician to bill for.")
      const day = atTime(r.issued, "00:00")
      const [last] = await tx
        .select({ end: max(bookings.endsAt) })
        .from(bookings)
        .where(
          and(
            eq(bookings.practitionerId, patient.practitionerId),
            gte(bookings.startsAt, startOfDay(day)),
            lt(bookings.startsAt, endOfDay(day))
          )
        )
      const lengths = await tx
        .select({ id: procedures.id, minutes: procedures.minutes })
        .from(procedures)
      let at =
        last?.end && last.end > atTime(r.issued, "09:00")
          ? last.end
          : atTime(r.issued, "09:00")
      let seq = await nextSeq(tx, day)
      for (const [i, line] of r.lines.entries()) {
        const minutes =
          lengths.find((p) => p.id === line.procedureId)?.minutes ?? 30
        const [made] = await tx
          .insert(bookings)
          .values({
            patientId: patient.id,
            practitionerId: patient.practitionerId,
            procedureId: line.procedureId,
            startsAt: at,
            endsAt: addMinutes(at, minutes),
            status: "unpaid",
            fee: totals.fees[i],
            bill,
            seq: seq++,
          })
          .returning({ id: bookings.id })
        if (!made) throw new Refused("That invoice couldn't be raised.")
        await tx.insert(bookingEvents).values({
          bookingId: made.id,
          patientId: patient.id,
          practitionerId: patient.practitionerId,
          procedureId: line.procedureId,
          kind: "booked",
          detail: `Scheduled for ${clock(at)}`,
          at: now,
        })
        at = addMinutes(at, minutes)
      }
      return patient.email
    })
    if (!result.ok) return result
    const raised = (await getLedger()).find((i) => i.key === bill)
    return {
      ok: true as const,
      message: result.message,
      number: raised?.number ?? "",
      total: totals.total,
    }
  })

/** The number the next bill on a day would take ("Draft INV-20260927-6") */
export const nextInvoiceNumber = authActionClient
  .inputSchema(z.iso.date())
  .action(async ({ parsedInput: isoDate }) =>
    nextNumber(await getLedger(), atTime(isoDate, "00:00"))
  )
