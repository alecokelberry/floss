// The dental practice's data model. All data is synthetic.
// After editing, run `pnpm db:generate`, read the SQL, then `pnpm db:migrate`; a new table's migration adds
// `select watch_writes('<table>')` so live refresh sees its writes.
import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp as pgTimestamp,
  serial,
  text,
} from "drizzle-orm/pg-core"

const timestamp = (name: string) =>
  pgTimestamp(name, { withTimezone: true, precision: 3 })

/** A booking's state on the board, in the order the status select lists them */
export const BOOKING_STATUSES = [
  "booked",
  "arrived",
  "in_chair",
  "completed",
  "unpaid",
  "cancelled",
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** The twelve colors a chair can wear (Settings → Chairs), named for their shades */
export const CHAIR_COLORS = [
  "tomato",
  "flamingo",
  "tangerine",
  "banana",
  "sage",
  "basil",
  "peacock",
  "blueberry",
  "lavender",
  "grape",
  "graphite",
  "obsidian",
] as const
export type ChairColor = (typeof CHAIR_COLORS)[number]

/** Each practitioner has a chair: the daily five are in most days, the relief four on their own weekdays */
export const practitioners = pgTable("practitioners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  qualification: text("qualification").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  /** ISO date */
  joinedOn: text("joined_on").notNull(),
  /** Their portrait; none shows their initials */
  photoUrl: text("photo_url"),
  color: text("color", { enum: CHAIR_COLORS }).notNull(),
  chairGroup: text("chair_group", { enum: ["daily", "relief"] }).notNull(),
  /** Drawn on the calendar (Settings → Chairs) */
  onBoard: boolean("on_board").notNull(),
  sortOrder: integer("sort_order").notNull(),
})

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["Chairside", "Surgical"] }).notNull(),
  sortOrder: integer("sort_order").notNull(),
})

/** The treatments, their chair time and list price (whole dollars) */
export const procedures = pgTable("procedures", {
  id: text("id").primaryKey(),
  /** The ADA's CDT code the ledger and a claim carry ("D1110") */
  code: text("code").notNull(),
  name: text("name").notNull(),
  minutes: integer("minutes").notNull(),
  /** What the ledger bills (Settings → Procedures), dollars and cents */
  price: numeric("price", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull(),
  /** The shipped price, for Reset to list price */
  listPrice: numeric("list_price", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull(),
  sortOrder: integer("sort_order").notNull(),
})

export const PATIENT_STAGES = ["new", "in_chair", "active", "lapsed"] as const
export type PatientStage = (typeof PATIENT_STAGES)[number]

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  /** "PT-2041" */
  chart: text("chart").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  /** Their primary practitioner; null for a new patient not yet assigned */
  practitionerId: text("practitioner_id").references(() => practitioners.id),
  stage: text("stage", { enum: PATIENT_STAGES }).notNull(),
  /** Their dental plan's carrier ("Delta Dental PPO"); null is self-pay */
  carrier: text("carrier"),
  memberId: text("member_id"),
  /** ISO date the desk last checked their benefits with the carrier */
  verifiedOn: text("verified_on"),
  /** Months between hygiene visits: 6, or 3 for perio maintenance */
  recallMonths: integer("recall_months").notNull().default(6),
  /** ISO date of their last hygiene visit (cleaning or perio maintenance); null if they've never had one here */
  lastHygieneOn: text("last_hygiene_on"),
  createdAt: timestamp("created_at").notNull(),
  /** Taken off the directory; their appointments stay on the diary */
  removedAt: timestamp("removed_at"),
})

/**
 * A chair booked for a patient. Payments has no table of its own: every Completed or Unpaid booking is an invoice
 * (src/lib/invoices.ts), numbered by its place in the day's list (`seq`), priced from its procedure unless `fee` says
 * otherwise.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id),
    procedureId: text("procedure_id")
      .notNull()
      .references(() => procedures.id),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull(),
    roomId: text("room_id").references(() => rooms.id),
    note: text("note"),
    /** A fee other than the procedure's price, set on the invoice (dollars and cents) */
    fee: numeric("fee", { precision: 10, scale: 2, mode: "number" }),
    /** Lines raised together in the New invoice wizard share a bill, and read as one invoice */
    bill: text("bill"),
    /** Order in its day's list: the seed runs by time, then roster order; a booking made in the app goes last */
    seq: integer("seq").notNull(),
  },
  (t) => [
    index("bookings_starts_at").on(t.startsAt),
    index("bookings_patient").on(t.patientId),
  ]
)

export const PLAN_STATUSES = ["proposed", "accepted", "declined"] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]

/** A line on a treatment plan: a procedure, on a tooth (Universal numbering, 1–32) or none, at a fee */
export type PlanItem = {
  procedureId: string
  tooth: number | null
  fee: number
}

/**
 * Treatment a dentist has presented and the patient hasn't finished: proposed until they accept or decline it at the
 * desk. What insurance is expected to pay is worked out from the carrier and the codes (src/lib/treatment.ts).
 */
export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id),
    items: jsonb("items").$type<PlanItem[]>().notNull(),
    status: text("status", { enum: PLAN_STATUSES }).notNull(),
    /** ISO dates */
    presentedOn: text("presented_on").notNull(),
    decidedOn: text("decided_on"),
  },
  (t) => [index("treatment_plans_patient").on(t.patientId)]
)

/** Time a chair is held for something other than a patient: Lunch, Post-op Calls, Sterilization, Case Review */
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  practitionerId: text("practitioner_id")
    .notNull()
    .references(() => practitioners.id),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
})

export const EVENT_KINDS = [
  "booked",
  "rescheduled",
  "status",
  "updated",
  "cancelled",
] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/**
 * The board's log: every booking made, moved, restatused, corrected or cancelled. The Calendar's Log History and the
 * rail's notifications read it. Names are kept on the row, so a cancelled (deleted) booking still reads.
 */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id),
    procedureId: text("procedure_id")
      .notNull()
      .references(() => procedures.id),
    kind: text("kind", { enum: EVENT_KINDS }).notNull(),
    /** "Marked Unpaid", "Moved to 10:45 AM", "Called to cancel" */
    detail: text("detail").notNull(),
    at: timestamp("at").notNull(),
    readAt: timestamp("read_at"),
  },
  (t) => [index("booking_events_at").on(t.at)]
)

export const TASK_CATEGORIES = [
  "procedure",
  "task",
  "insurance",
  "call",
  "meeting",
  "recall",
] as const
export type TaskCategory = (typeof TASK_CATEGORIES)[number]

/** Someone in a task's attendee group: a named person, or initials alone ("RC") */
export type Attendee = { name: string | null; initials: string }

/** The practice's work beyond the chairs (the Appointments page): procedures to prepare, calls, meetings, recalls */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category", { enum: TASK_CATEGORIES }).notNull(),
  allDay: boolean("all_day").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  reference: text("reference"),
  /** A patient's name, or "Internal" */
  patient: text("patient").notNull(),
  clinician: text("clinician").notNull(),
  attendees: jsonb("attendees").$type<Attendee[]>().notNull(),
  /** Everyone attending, the shown avatars included ("+6" is the rest) */
  attendeeCount: integer("attendee_count").notNull(),
  requirement: text("requirement").notNull(),
  /** ISO date */
  dueOn: text("due_on").notNull(),
  sourceTitle: text("source_title"),
  /** ISO date */
  sourceOn: text("source_on"),
  stage: text("stage"),
  workstream: text("workstream", {
    enum: ["Tasks", "Treatment Plan", "Paperwork"],
  }),
  workDone: integer("work_done"),
  workTotal: integer("work_total"),
  status: text("status"),
  priority: text("priority", { enum: ["Low", "Medium", "High"] }),
  recurring: boolean("recurring").notNull().default(false),
  room: text("room"),
  state: text("state", {
    enum: ["To Do", "In Progress", "Waiting", "Scheduled"],
  }).notNull(),
  passes: integer("passes").notNull().default(0),
  fails: integer("fails").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  note: text("note"),
  notes: integer("notes").notNull().default(0),
})

/** The practice's settings, one JSON value per key (src/lib/settings.ts holds the keys and their shapes) */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
})

/**
 * The clinic's clock (src/lib/clock.ts): one row. The clinic's time is `clinicStart` plus the real time since
 * `seededAt`; paused, it stands at `pausedAt`'s moment.
 */
export const demoDay = pgTable("demo_day", {
  id: integer("id").primaryKey(),
  seededAt: timestamp("seeded_at").notNull(),
  clinicStart: timestamp("clinic_start").notNull(),
  pausedAt: timestamp("paused_at"),
})

export const practitionersRelations = relations(practitioners, ({ many }) => ({
  bookings: many(bookings),
  blocks: many(blocks),
  patients: many(patients),
}))

export const patientsRelations = relations(patients, ({ one, many }) => ({
  practitioner: one(practitioners, {
    fields: [patients.practitionerId],
    references: [practitioners.id],
  }),
  bookings: many(bookings),
  events: many(bookingEvents),
  plans: many(treatmentPlans),
}))

export const treatmentPlansRelations = relations(treatmentPlans, ({ one }) => ({
  patient: one(patients, {
    fields: [treatmentPlans.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [treatmentPlans.practitionerId],
    references: [practitioners.id],
  }),
}))

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  patient: one(patients, {
    fields: [bookings.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [bookings.practitionerId],
    references: [practitioners.id],
  }),
  procedure: one(procedures, {
    fields: [bookings.procedureId],
    references: [procedures.id],
  }),
  room: one(rooms, { fields: [bookings.roomId], references: [rooms.id] }),
  events: many(bookingEvents),
}))

export const blocksRelations = relations(blocks, ({ one }) => ({
  practitioner: one(practitioners, {
    fields: [blocks.practitionerId],
    references: [practitioners.id],
  }),
}))

export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingEvents.bookingId],
    references: [bookings.id],
  }),
  patient: one(patients, {
    fields: [bookingEvents.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [bookingEvents.practitionerId],
    references: [practitioners.id],
  }),
  procedure: one(procedures, {
    fields: [bookingEvents.procedureId],
    references: [procedures.id],
  }),
}))

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
})

export const authAccounts = pgTable("auth_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  /** A scrypt hash, never the password */
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const authVerifications = pgTable("auth_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

/**
 * One row that every write bumps, through a statement trigger on each table (the baseline migration): pages poll it
 * to re-render only after a real write.
 */
export const dataVersion = pgTable("data_version", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull().default(0),
  writtenAt: timestamp("written_at").notNull().defaultNow(),
})

/** Better Auth's model names → our tables */
export const authSchema = {
  user: authUsers,
  session: authSessions,
  account: authAccounts,
  verification: authVerifications,
}
