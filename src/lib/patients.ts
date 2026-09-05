// The Patients page's rules: the patient form and the message dialog as the desk checks them, the Filters bar's conditions, the next chart number, the stat cards and "46 min ago".
import { z } from "zod"

import { PATIENT_STAGES, type PatientStage } from "@/db/schema"
import { CARRIERS } from "@/lib/insurance"

export const STAGES = PATIENT_STAGES

const PHONE = /^[\d\s+()-]+$/
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** A reachable number: seven digits or more, and only digits, spaces, + ( ) and - */
export const phoneOk = (v: string) =>
  PHONE.test(v) && v.replace(/\D/g, "").length >= 7

/** An address with a dot after the @ */
export const emailOk = (v: string) => EMAIL.test(v)

/**
 * New and Edit Patient: a name and a PT-0000 chart; phone and email only checked when given; a carrier needs the member
 * ID off their card ("" is self-pay)
 */
export const patientInput = z
  .object({
    name: z.string().trim().min(1, "Give the patient a name."),
    chart: z
      .string()
      .trim()
      .min(1, "Every patient needs a chart number.")
      .regex(/^PT-\d{4}$/, "Use the PT-0000 format."),
    phone: z
      .string()
      .trim()
      .refine((v) => !v || phoneOk(v), "Enter a reachable number."),
    email: z
      .string()
      .trim()
      .refine((v) => !v || emailOk(v), "Enter a valid email address."),
    practitionerId: z.string().nullable(),
    stage: z.enum(PATIENT_STAGES),
    carrier: z.union([z.literal(""), z.enum(CARRIERS)]),
    memberId: z.string().trim(),
  })
  .refine((p) => !p.carrier || p.memberId, {
    path: ["memberId"],
    message: "Add the member ID from their card.",
  })
export type PatientInput = z.infer<typeof patientInput>

/** The message dialog: who it goes to (a phone or an email) and something to say */
export const messageInput = z.object({
  to: z
    .string()
    .trim()
    .min(1, "Say who this is going to.")
    .refine(
      (v) => phoneOk(v) || emailOk(v),
      "Enter a phone number or an email address."
    ),
  subject: z.string(),
  body: z.string().trim().min(1, "Write something before sending."),
})

/** "Ada Okonkwo" into first and last: the last word is the family name */
export function splitName(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return { firstName: words[0] ?? "", lastName: "" }
  return {
    firstName: words.slice(0, -1).join(" "),
    lastName: words.at(-1) ?? "",
  }
}

/** The next free chart number from PT-3001 up (the seeded patients are below it) */
export function nextChart(charts: string[]) {
  const top = Math.max(
    3000,
    ...charts.map((c) => Number(c.replace("PT-", ""))).filter(Number.isFinite)
  )
  return `PT-${top + 1}`
}

type Counted = { upcoming: number; unpaid: number; stage: PatientStage }

/** The four stat cards: patients, upcoming (share with any), in chair and unpaid (shares of all) */
export function directoryStats(list: Counted[]) {
  const n = list.length
  const share = (k: number) => (n ? Math.round((k / n) * 100) : 0)
  const inChair = list.filter((p) => p.stage === "in_chair").length
  const unpaid = list.filter((p) => p.unpaid > 0).length
  return {
    patients: n,
    upcoming: list.reduce((t, p) => t + p.upcoming, 0),
    upcomingShare: share(list.filter((p) => p.upcoming > 0).length),
    inChair,
    inChairShare: share(inChair),
    unpaid,
    unpaidShare: share(unpaid),
  }
}

/** "Just now", "46 min ago", "2 hours ago", "3 days ago" against the clinic's clock */
export function ago(at: Date, now: number) {
  const minutes = Math.floor((now - at.getTime()) / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"} ago`
}
