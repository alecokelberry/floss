// Seeds the practice (src/db/seed-data.ts) around the day it runs: today exactly as written, and every patient's
// visits before and after it on the days their practitioner works, each given a time in its chair's day. Deterministic:
// the same day seeds the same rows. `pnpm db:seed` wipes and reseeds.
import { pathToFileURL } from "node:url"

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import { Pool } from "pg"

import { clinicMoment, DAY_MOMENT_MIN } from "../lib/clock"
import { addDays, atMinute, isoDay, startOfDay, weekday } from "../lib/dates"
import { CARRIERS } from "../lib/insurance"
import { practitionerPhoto } from "../lib/portraits"
import { isHygiene } from "../lib/recall"
import { DEFAULT_SETTINGS, SETTING_KEYS } from "../lib/settings"
import { databaseUrl } from "./database-url"
import {
  type BookingStatus,
  blocks,
  bookingEvents,
  bookings,
  demoDay,
  type EventKind,
  type PatientStage,
  patients,
  type PlanStatus,
  practitioners,
  procedures,
  rooms,
  settings,
  tasks,
  treatmentPlans,
} from "./schema"
import {
  BLOCKS,
  type BookingLine,
  MORE_PATIENTS,
  PATIENTS,
  PRACTITIONERS,
  PROCEDURES,
  ROOMS,
  rows,
  TASKS,
  TODAY,
  TODAYS_LOG,
  VISITS,
} from "./seed-data"
import { removeRetiredStaff, seedStaff } from "./seed-staff"

type Db = PgDatabase<PgQueryResultHKT>

const LUNCH_MINUTES = 45
/** A chair's first visit of the day; later ones follow with a gap */
const DAY_START = 8 * 60 + 30

const chairOf = (id: string) => {
  const p = PRACTITIONERS.find((x) => x.id === id)
  if (!p) throw new Error(`No practitioner ${id}`)
  return p
}
const minutesOf = (id: string) => {
  const p = PROCEDURES.find((x) => x.id === id)
  if (!p) throw new Error(`No procedure ${id}`)
  return p.minutes
}
const toMinutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const isWeekend = (d: Date) => weekday(d) === 0 || weekday(d) === 6

/** The date `n` business days from `today` (today itself always counts as one) */
export function businessDay(today: Date, n: number) {
  let d = today
  for (let left = Math.abs(n); left > 0;) {
    d = addDays(d, Math.sign(n))
    if (!isWeekend(d)) left--
  }
  return d
}

/**
 * Wipe the practice's data and seed it around `real` (the real time now): the clinic clock runs from 11:24 that day.
 * `empty` leaves today without bookings.
 */
export async function seedClinic(
  database: PgDatabase<PgQueryResultHKT, Record<string, unknown>>,
  real = Date.now(),
  { empty = false }: { empty?: boolean } = {}
) {
  const db = database as unknown as Db
  const today = startOfDay(real)

  await db.execute(
    sql`truncate ${treatmentPlans}, ${bookingEvents}, ${bookings}, ${blocks}, ${tasks}, ${patients}, ${procedures}, ${rooms}, ${practitioners}, ${settings}, ${demoDay} restart identity cascade`
  )
  await seedStaff(db)
  await removeRetiredStaff(db)

  await db.insert(practitioners).values(
    PRACTITIONERS.map(
      ({ room: _room, days: _days, procedures: _p, lunch: _l, ...p }, i) => ({
        ...p,
        photoUrl: practitionerPhoto(p.id),
        onBoard: p.chairGroup === "daily",
        sortOrder: i,
      })
    )
  )
  await db.insert(rooms).values(ROOMS.map((r, i) => ({ ...r, sortOrder: i })))
  await db
    .insert(procedures)
    .values(
      PROCEDURES.map((p, i) => ({ ...p, listPrice: p.price, sortOrder: i }))
    )

  const lines = empty
    ? visitLines(today)
    : [...todayLines(), ...visitLines(today)]
  const dateOf = (b: Line) => b.date ?? today
  const hygiene = hygieneDates(lines, today)

  const inserted = await db
    .insert(patients)
    .values(
      patientRows().map((p) => ({
        ...insuranceOf(p.chart, today),
        ...hygiene(p),
        chart: `PT-${p.chart}`,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: `${p.firstName}.${p.lastName}@example.com`
          .toLowerCase()
          .replace(/[\s']+/g, ""),
        practitionerId: p.practitionerId,
        stage: p.stage,
        createdAt: addDays(today, -p.since),
      }))
    )
    .returning({ id: patients.id, chart: patients.chart })
  const patientId = (chart: number) =>
    inserted.find((p) => p.chart === `PT-${chart}`)!.id

  const seq = sequence(lines)
  const bookingIds = await db
    .insert(bookings)
    .values(
      lines.map((b, i) => ({
        patientId: patientId(b.chart),
        practitionerId: b.practitioner,
        procedureId: b.procedure,
        startsAt: atMinute(dateOf(b), toMinutes(b.start)),
        endsAt: atMinute(dateOf(b), toMinutes(b.start) + b.minutes),
        status: b.status,
        roomId: chairOf(b.practitioner).room,
        seq: seq[i] ?? i + 1,
      }))
    )
    .returning({ id: bookings.id })

  // Lunch for everyone in on each working day with visits around it; today's for the chairs today books
  const at = atMinute
  const lunch = (date: Date, practitionerId: string) => {
    const start = chairOf(practitionerId).lunch
    return {
      practitionerId,
      title: "Lunch",
      startsAt: at(date, start),
      endsAt: at(date, start + LUNCH_MINUTES),
    }
  }
  const days = lines.filter((b) => b.date).map((b) => b.date!.getTime())
  const workingDays: Date[] = []
  for (
    let d = new Date(Math.min(...days));
    d.getTime() <= Math.max(...days);
    d = addDays(d, 1)
  )
    if (!isWeekend(d) && d.getTime() !== today.getTime()) workingDays.push(d)
  const inToday = empty
    ? []
    : [...new Set(rows(TODAY, 6).map(([, , , , who]) => who))]
  await db.insert(blocks).values([
    ...inToday.map((id) => lunch(today, id)),
    ...(empty ? [] : rows(BLOCKS, 4)).map(
      ([start, minutes, practitionerId, title]) => ({
        practitionerId,
        title,
        startsAt: at(today, toMinutes(start)),
        endsAt: at(today, toMinutes(start) + Number(minutes)),
      })
    ),
    ...workingDays.flatMap((d) =>
      PRACTITIONERS.filter((p) => p.days.includes(weekday(d))).map((p) =>
        lunch(d, p.id)
      )
    ),
  ])

  if (!empty) {
    // The booking a log line is about: that patient's today, the cancelled one for a cancellation, the one in that
    // state for a status line
    const bookingOf = (chart: number, kind: EventKind, detail: string) => {
      const i = lines.findIndex(
        (b) =>
          !b.date &&
          b.chart === chart &&
          (kind === "cancelled"
            ? b.status === "cancelled"
            : detail.startsWith("Marked")
              ? b.status === detail.slice(7).toLowerCase().replace(" ", "_")
              : b.status !== "cancelled")
      )
      const line = lines[i]
      const booked = bookingIds[i]
      if (!line || !booked)
        throw new Error(`No booking today for ${chart}: ${detail}`)
      return { line, id: booked.id }
    }
    await db.insert(bookingEvents).values(
      rows(TODAYS_LOG, 5).map(([time, chart, kind, detail, read]) => {
        const hit = bookingOf(Number(chart), kind as EventKind, detail)
        return {
          bookingId: hit.id,
          patientId: patientId(Number(chart)),
          practitionerId: hit.line.practitioner,
          procedureId: hit.line.procedure,
          kind: kind as EventKind,
          detail,
          at: at(today, toMinutes(time)),
          readAt: read === "read" ? at(today, toMinutes(time)) : null,
        }
      })
    )
  }

  await db.insert(treatmentPlans).values(
    planRows(today).map((plan) => ({
      ...plan,
      patientId: patientId(plan.chart),
    }))
  )

  await db.insert(tasks).values(
    TASKS.map((t) => {
      const day = businessDay(today, t.day)
      const [from = "00:00", to = "23:59"] = (t.time ?? "").split("-")
      return {
        title: t.title,
        category: t.category,
        allDay: !t.time,
        startsAt: at(day, t.time ? toMinutes(from) : 0),
        endsAt: t.time ? at(day, toMinutes(to)) : addDays(day, 1),
        reference: t.reference ?? null,
        patient: t.patient,
        clinician: t.clinician,
        attendees: t.attendees,
        attendeeCount: t.attendeeCount,
        requirement: t.requirement,
        dueOn: isoDay(addDays(today, t.dueOffset)),
        sourceTitle: t.source?.[0] ?? null,
        sourceOn: t.source?.[1] ?? null,
        stage: t.stage ?? null,
        workstream: t.workstream ?? null,
        workDone: t.work?.[0] ?? null,
        workTotal: t.work?.[1] ?? null,
        status: t.status ?? null,
        priority: t.priority ?? null,
        recurring: t.recurring ?? false,
        room: t.room ?? null,
        state: t.state,
        passes: t.checks?.[0] ?? 0,
        fails: t.checks?.[1] ?? 0,
        pending: t.checks?.[2] ?? 0,
        note: t.note ?? null,
        notes: t.notes ?? 0,
      }
    })
  )

  await db
    .insert(settings)
    .values(SETTING_KEYS.map((key) => ({ key, value: DEFAULT_SETTINGS[key] })))
  await db.insert(demoDay).values({
    id: 1,
    seededAt: new Date(real),
    clinicStart: new Date(clinicMoment(real, DAY_MOMENT_MIN)),
    pausedAt: null,
  })
}

/** A booking to seed: today's have no date (they're on today), the rest carry theirs */
type Line = BookingLine & { date?: Date }

function todayLines(): Line[] {
  return rows(TODAY, 6).map(
    ([start, minutes, chart, procedure, practitioner, status]) => ({
      day: 0,
      start,
      minutes: Number(minutes),
      chart: Number(chart),
      procedure,
      practitioner,
      status: status as BookingStatus,
    })
  )
}

/** A stable spread from a chart number (an integer hash): the same patient always lands the same way */
function spread(chart: number, salt: number, n: number) {
  // murmur3's finalizer over the two numbers, then the top bits scaled to n
  let h = Math.imul(chart ^ Math.imul(salt, 0x9e37_79b9), 0x85eb_ca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35)
  h ^= h >>> 16
  return Math.floor(((h >>> 0) / 2 ** 32) * n)
}

/** Each care plan's practitioner, and its visits as `[business day, procedure, practitioner]` from a start day */
const PLANS: Record<
  string,
  {
    primary: string
    stage?: PatientStage
    visits: (d: number, chart: number) => [number, string, string][]
  }
> = {
  hygiene: {
    primary: "chen",
    visits: (d) => [
      [d, "checkup", "chen"],
      [d, "scaling", "sato"],
    ],
  },
  restor: {
    primary: "chen",
    visits: (d, chart) => [
      [d, "checkup", "chen"],
      [d, "scaling", "sato"],
      [d + 6, "filling", "chen"],
      [d + 14, "filling", "chen"],
      ...(chart % 2
        ? ([
            [d + 22, "crown", "chen"],
            [d + 32, "crown", "chen"],
          ] as [number, string, string][])
        : []),
    ],
  },
  endo: {
    primary: "menon",
    visits: (d) => [
      [d, "checkup", "menon"],
      [d + 3, "root-canal", "menon"],
      [d + 14, "crown", "chen"],
      [d + 24, "crown", "chen"],
    ],
  },
  ortho: {
    primary: "novak",
    visits: (d) => [-40, -20, 0, 20, 40].map((k) => [d + k, "braces", "novak"]),
  },
  perio: {
    primary: "weber",
    visits: (d) => [
      [d, "srp", "weber"],
      [d + 5, "srp", "weber"],
      [d + 40, "perio-maint", "weber"],
    ],
  },
  implant: {
    primary: "falk",
    visits: (d) => [
      [d, "extraction", "reyes"],
      [d + 20, "implant-place", "falk"],
      [d + 30, "implant", "falk"],
      [d + 50, "crown", "duarte"],
    ],
  },
  cosmetic: {
    primary: "raman",
    visits: (d) => [
      [d, "whitening", "raman"],
      [d + 10, "veneer", "raman"],
      [d + 20, "veneer", "raman"],
    ],
  },
  prosth: {
    primary: "duarte",
    visits: (d) => [
      [d, "denture", "duarte"],
      [d + 10, "denture", "duarte"],
      [d + 20, "denture", "duarte"],
      [d + 30, "denture", "duarte"],
    ],
  },
  lapsed: { primary: "chen", stage: "lapsed", visits: () => [] },
  new: {
    primary: "chen",
    stage: "new",
    visits: (d) => [
      [Math.abs(d) + 2, "checkup", "chen"],
      [Math.abs(d) + 2, "scaling", "sato"],
    ],
  },
  "new-ortho": {
    primary: "novak",
    stage: "new",
    visits: (d) => [[Math.abs(d) + 3, "ortho-consult", "novak"]],
  },
}

/** A patient's care plan by name; a name that isn't one is a typo in the seed */
function planOf(name: string) {
  const plan = PLANS[name]
  if (!plan) throw new Error(`No care plan called ${name}`)
  return plan
}

/** Where the generated plans start: five weeks back to two ahead, so the weeks either side of today fill alike */
const PAST = 25
const AHEAD = 10

const AREA_CODES = ["(303)", "(720)", "(719)"]

/** Every patient with their details: the hand-written ones as written, the rest from their plan */
function patientRows() {
  const written = rows(PATIENTS, 7).map(
    ([chart, firstName, lastName, practitionerId, stage, phone, since]) => ({
      chart: Number(chart),
      firstName,
      lastName,
      practitionerId,
      stage: stage as PatientStage,
      phone,
      since: Number(since),
      perio: practitionerId === "weber",
    })
  )
  const planned = rows(MORE_PATIENTS, 4).map(
    ([chart, firstName, lastName, plan], i) => {
      const n = Number(chart)
      const { primary, stage } = planOf(plan)
      return {
        chart: n,
        firstName,
        lastName,
        practitionerId: primary,
        stage: stage ?? "active",
        perio: plan === "perio",
        phone: `${AREA_CODES[i % 3]} 555-01${String((i % 79) + 21).padStart(2, "0")}`,
        since:
          stage === "new"
            ? 5 + spread(n, 1, 20)
            : stage === "lapsed"
              ? 900 + spread(n, 2, 1500)
              : 120 + spread(n, 3, 3000),
      }
    }
  )
  return [...written, ...planned]
}

/** A carrier for most patients (about one in eight pays for themselves), a member ID, and when benefits were last checked:
 * recently for most, weeks too long ago for some, never for a few */
function insuranceOf(chart: number, today: Date) {
  const carrier =
    spread(chart, 5, 8) === 0
      ? null
      : (CARRIERS[spread(chart, 9, CARRIERS.length)] ?? null)
  if (!carrier) return { carrier, memberId: null, verifiedOn: null }
  const checked = spread(chart, 6, 5)
  return {
    carrier,
    memberId: `${carrier.slice(0, 1)}${String(100_000_000 + spread(chart, 10, 899_999_999))}`,
    verifiedOn:
      checked === 0
        ? null
        : isoDay(
            addDays(
              today,
              checked === 1
                ? -(40 + spread(chart, 11, 80))
                : -(1 + spread(chart, 12, 25))
            )
          ),
  }
}

/**
 * Each patient's recall: every three months for perio patients, six for the rest, from their last cleaning. That's the
 * last one the seed completed; before a first booked one, the interval before it; otherwise a date in the past that
 * leaves the practice with some overdue, some due this month and most current. New patients have none yet.
 */
function hygieneDates(lines: Line[], today: Date) {
  const past = new Map<number, Date>()
  const next = new Map<number, Date>()
  for (const b of lines) {
    if (!isHygiene(b.procedure) || b.status === "cancelled") continue
    const date = b.date ?? today
    const map = date < today ? past : next
    const seen = map.get(b.chart)
    if (!seen || (date < today ? date > seen : date < seen))
      map.set(b.chart, date)
  }
  return (p: { chart: number; stage: PatientStage; perio: boolean }) => {
    const recallMonths = p.perio ? 3 : 6
    const last =
      past.get(p.chart) ??
      (next.get(p.chart) &&
        addDays(next.get(p.chart) ?? today, -recallMonths * 30)) ??
      (p.stage === "new"
        ? null
        : addDays(
            today,
            p.stage === "lapsed"
              ? -(420 + spread(p.chart, 13, 500))
              : p.perio
                ? -(10 + spread(p.chart, 14, 90))
                : -(30 + spread(p.chart, 14, 170))
          ))
    return { recallMonths, lastHygieneOn: last ? isoDay(last) : null }
  }
}

/** A treatment plan's lines by care plan, `[procedure, tooth]`; the chart number picks the teeth */
const PLAN_ITEMS: Record<string, (chart: number) => [string, number | null][]> =
  {
    restor: (c) => [
      ["filling", [3, 14, 19, 30][c % 4] ?? 3],
      ["filling", [2, 15, 18, 31][c % 4] ?? 2],
      ["crown", [30, 19, 14, 3][c % 4] ?? 30],
    ],
    endo: (c) => {
      const tooth = [3, 14, 19, 30][c % 4] ?? 3
      return [
        ["root-canal", tooth],
        ["crown", tooth],
      ]
    },
    implant: (c) => {
      const tooth = [19, 30, 3, 14][c % 4] ?? 19
      return [
        ["extraction", tooth],
        ["implant-place", tooth],
        ["crown", tooth],
      ]
    },
    cosmetic: () => [
      ["whitening", null],
      ["veneer", 8],
      ["veneer", 9],
    ],
    prosth: () => [["denture", null]],
    perio: () => [
      ["srp", null],
      ["srp", null],
    ],
  }

/** Who presents a plan: the care plan's dentist, and the surgeon for an implant */
const PRESENTER: Record<string, string> = {
  restor: "chen",
  endo: "menon",
  implant: "falk",
  cosmetic: "raman",
  prosth: "duarte",
  perio: "weber",
}

/**
 * The practice's treatment plans. Accepted: the first patient on each care plan that has one, whose visits are the
 * plan on the board. Still deciding, or declined (every fourth): hygiene patients whose exam found work, each handed
 * one of the same plans in turn.
 */
export function planRows(today: Date) {
  const kinds = Object.keys(PLAN_ITEMS)
  const accepted = new Set<string>()
  let found = 0
  return rows(MORE_PATIENTS, 4).flatMap(([chartText, , , plan]) => {
    const chart = Number(chartText)
    let kind: string
    let status: PlanStatus
    if (PLAN_ITEMS[plan] && !accepted.has(plan)) {
      accepted.add(plan)
      kind = plan
      status = "accepted"
    } else if (plan === "hygiene" && found < 12) {
      kind = kinds[found % kinds.length] ?? "restor"
      status = found % 4 === 3 ? "declined" : "proposed"
      found++
    } else return []
    const items = PLAN_ITEMS[kind]?.(chart) ?? []
    const presented = addDays(today, -(3 + spread(chart, 8, 30)))
    return [
      {
        chart,
        practitionerId: PRESENTER[kind] ?? "chen",
        items: items.map(([procedureId, tooth]) => ({
          procedureId,
          tooth,
          fee: PROCEDURES.find((p) => p.id === procedureId)?.price ?? 0,
        })),
        status,
        presentedOn: isoDay(presented),
        decidedOn:
          status === "proposed"
            ? null
            : isoDay(addDays(presented, 1 + spread(chart, 15, 3))),
      },
    ]
  })
}

type Visit = {
  chart: number
  day: number
  procedure: string
  practitioner: string
  status?: BookingStatus
}

/** Every visit beyond today: the hand-written ones, then each planned patient's, inside the plans' reach */
function visitRows(): Visit[] {
  const written = rows(VISITS, 4).map(
    ([chart, day, procedure, practitioner, status]): Visit => ({
      chart: Number(chart),
      day: Number(day),
      procedure,
      practitioner,
      status: (status || undefined) as BookingStatus | undefined,
    })
  )
  const planned = rows(MORE_PATIENTS, 4).flatMap(([chartText, , , plan]) => {
    const chart = Number(chartText)
    const start = spread(chart, 4, PAST + AHEAD) - PAST
    return planOf(plan)
      .visits(start, chart)
      .filter(([day]) => day !== 0 && day >= -PAST - 20 && day <= AHEAD + 20)
      .map(([day, procedure, practitioner]): Visit => ({
        chart,
        day,
        procedure,
        practitioner,
        // About one in twenty is called off; one past visit in twenty-five is still owed
        status:
          spread(chart, day + 7, 20) === 0
            ? "cancelled"
            : day < 0 && spread(chart, day, 25) === 0
              ? "unpaid"
              : undefined,
      }))
  })
  return [...written, ...planned]
}

/** A chair's day ends here: a visit that won't fit moves to the chair's next day */
const DAY_END = 17 * 60 + 30

/**
 * Every visit beyond today on a date its practitioner works, in each chair's day from 8:30: one after another with a
 * gap, around lunch, never while the same patient is in another chair, and on to their next day when the chair is
 * full. Past visits are Completed unless they say otherwise, future ones Booked.
 */
export function visitLines(today: Date): Line[] {
  const chairEnd = new Map<string, number>()
  const patientEnd = new Map<string, number>()
  return visitRows().map(({ chart, day, procedure, practitioner, status }) => {
    const chair = chairOf(practitioner)
    if (!chair.procedures.includes(procedure))
      throw new Error(`${chair.name} doesn't do ${procedure}`)
    const away = day < 0 ? -1 : 1
    const minutes = minutesOf(procedure)
    let date = businessDay(today, day)
    let start = 0
    for (;;) {
      while (!chair.days.includes(weekday(date))) date = addDays(date, away)
      const key = isoDay(date)
      start = Math.max(
        chairEnd.get(`${key}|${practitioner}`) ?? DAY_START,
        patientEnd.get(`${key}|${chart}`) ?? 0
      )
      if (start < chair.lunch + LUNCH_MINUTES && start + minutes > chair.lunch)
        start = chair.lunch + LUNCH_MINUTES
      if (start + minutes <= DAY_END) break
      date = addDays(date, away)
    }
    const key = isoDay(date)
    // A quarter hour between visits, half an hour after every other patient
    chairEnd.set(
      `${key}|${practitioner}`,
      start + minutes + (chart % 2 ? 15 : 30)
    )
    patientEnd.set(`${key}|${chart}`, start + minutes)
    return {
      day,
      date,
      start: hhmm(start),
      minutes,
      chart,
      procedure,
      practitioner,
      status: status ?? (day < 0 ? "completed" : "booked"),
    }
  })
}

/** Each booking's place in its day's list: by start, then in roster order */
function sequence(lines: Line[]) {
  const order = PRACTITIONERS.map((p) => p.id)
  const dayKey = (b: Line) => (b.date ? isoDay(b.date) : "today")
  const seq = Array.from<number>({ length: lines.length })
  const byDay = new Map<string, { line: Line; index: number }[]>()
  lines.forEach((line, index) => {
    byDay.set(dayKey(line), [
      ...(byDay.get(dayKey(line)) ?? []),
      { line, index },
    ])
  })
  for (const day of byDay.values())
    day
      .toSorted(
        (a, b) =>
          toMinutes(a.line.start) - toMinutes(b.line.start) ||
          order.indexOf(a.line.practitioner) -
            order.indexOf(b.line.practitioner)
      )
      .forEach(({ index }, n) => {
        seq[index] = n + 1
      })
  return seq
}

// Run directly: `pnpm db:seed`
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const pool = new Pool({
    connectionString: databaseUrl({ direct: true }),
    max: 1,
  })
  drizzle({ client: pool })
    .transaction((tx) => seedClinic(tx))
    .then(() => console.info("Seeded the practice around today"))
    .catch((err) => {
      console.error(err)
      process.exitCode = 1
    })
    .finally(() => void pool.end())
}
