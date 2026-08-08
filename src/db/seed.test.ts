import { existsSync } from "node:fs"

import { and, gte, lt } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"

import { clinicDate, isoDay, minuteOfDay, weekday } from "@/lib/dates"

import { NOW, seedPractice } from "../../tests/clinic"
import { patientPhoto } from "../lib/portraits"
import { bookings, patients } from "./schema"
import { PRACTITIONERS } from "./seed-data"

describe("the seeded practice, around today", () => {
  let db: Awaited<ReturnType<typeof seedPractice>>["db"]
  let all: (typeof bookings.$inferSelect)[]
  beforeAll(async () => {
    ;({ db } = await seedPractice())
    all = await db.select().from(bookings)
  })

  const dayStart = clinicDate(2026, 8, 28)
  const dayEnd = clinicDate(2026, 8, 29)
  const chair = (id: string) => PRACTITIONERS.find((p) => p.id === id)!
  const overlaps = (list: typeof all) => {
    const sorted = list.toSorted((a, b) => +a.startsAt - +b.startsAt)
    return sorted.some((b, i) => i > 0 && b.startsAt < sorted[i - 1]!.endsAt)
  }
  const groups = (key: (b: (typeof all)[number]) => string) => {
    const out = new Map<string, typeof all>()
    for (const b of all.filter((x) => x.status !== "cancelled"))
      out.set(key(b), [...(out.get(key(b)) ?? []), b])
    return [...out.values()]
  }
  const day = (d: Date) => isoDay(d)

  it("has today's 27 bookings: the morning done, three in a chair, two waiting", async () => {
    const today = await db
      .select()
      .from(bookings)
      .where(
        and(gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd))
      )
    const count = (s: string) => today.filter((b) => b.status === s).length
    expect(today).toHaveLength(27)
    expect([
      count("completed"),
      count("unpaid"),
      count("in_chair"),
      count("arrived"),
      count("booked"),
      count("cancelled"),
    ]).toEqual([12, 1, 3, 2, 8, 1])
  })

  it("gives every procedure to a practitioner who does it, in their own room", () => {
    for (const b of all) {
      expect(chair(b.practitionerId).procedures, `booking ${b.id}`).toContain(
        b.procedureId
      )
      expect(b.roomId).toBe(chair(b.practitionerId).room)
    }
  })

  it("books a practitioner only on the days they're in, and never two patients at once", () => {
    for (const b of all.filter((x) => day(x.startsAt) !== day(NOW)))
      expect(chair(b.practitionerId).days, `booking ${b.id}`).toContain(
        weekday(b.startsAt)
      )
    for (const list of groups((b) => `${b.practitionerId}|${day(b.startsAt)}`))
      expect(overlaps(list)).toBe(false)
    for (const list of groups((b) => `${b.roomId}|${day(b.startsAt)}`))
      expect(overlaps(list)).toBe(false)
  })

  it("never has a patient in two chairs at once", () => {
    for (const list of groups((b) => `${b.patientId}|${day(b.startsAt)}`))
      expect(overlaps(list)).toBe(false)
  })

  it("keeps the past settled and the future booked", () => {
    for (const b of all.filter((x) => day(x.startsAt) !== day(NOW)))
      expect(
        b.startsAt < NOW
          ? ["completed", "unpaid", "cancelled"]
          : ["booked", "cancelled"],
        `booking ${b.id}`
      ).toContain(b.status)
  })

  it("fills the weeks around today, business day by business day", () => {
    const perDay = new Map<string, number>()
    for (const b of all)
      if (Math.abs(+b.startsAt - +NOW) < 21 * 86_400_000)
        perDay.set(day(b.startsAt), (perDay.get(day(b.startsAt)) ?? 0) + 1)
    perDay.delete(day(NOW))
    const counts = [...perDay.values()]
    expect(counts.length).toBeGreaterThanOrEqual(25)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(3)
    expect(counts.reduce((t, n) => t + n, 0) / counts.length).toBeGreaterThan(7)
  })

  it("has a portrait for every seeded patient", async () => {
    const list = await db.select({ chart: patients.chart }).from(patients)
    expect(list).toHaveLength(117)
    for (const p of list)
      expect(existsSync(`public${patientPhoto(p.chart)}`), p.chart).toBe(true)
  })

  it("starts the clinic clock at 11:24, running", () => {
    expect(minuteOfDay(NOW)).toBe(11 * 60 + 24)
  })
})
