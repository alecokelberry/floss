// The practice's settings (the Settings page): each key's shape and its
// default, so a missing or malformed row reads as the default. Chairs and procedures live in their own tables.
import { z } from "zod"

export const PAYMENT_TERMS = [7, 14, 30, 45, 60] as const

/** What someone at the desk does, My Profile's Role list */
export const ROLES = [
  "Practice manager",
  "Receptionist",
  "Dentist",
  "Hygienist",
  "Dental nurse",
] as const

export const SETTING_SCHEMAS = {
  /** My Profile: who's at the desk (the account's name lives on the user) */
  profile: z.object({
    username: z.string(),
    role: z.enum(ROLES),
    timeZone: z.string(),
    website: z.string(),
    bio: z.string(),
  }),
  /** The hours both calendars draw, on the hour, 0–23 */
  hours: z
    .object({
      open: z.number().int().min(0).max(22),
      close: z.number().int().min(1).max(23),
    })
    .refine((h) => h.close > h.open),
  /** Net days a patient has to settle an invoice */
  terms: z.union(PAYMENT_TERMS.map((n) => z.literal(n))),
  /** Which of the board's log lines reach the bell */
  alerts: z.object({
    booked: z.boolean(),
    rescheduled: z.boolean(),
    status: z.boolean(),
    updated: z.boolean(),
    cancelled: z.boolean(),
  }),
}

export type SettingKey = keyof typeof SETTING_SCHEMAS
export type Settings = {
  [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]>
}
export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[]

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    username: "d.whitaker",
    role: "Practice manager",
    timeZone: "UTC-7 (Mountain Time)",
    website: "",
    bio: "",
  },
  hours: { open: 8, close: 19 },
  terms: 30,
  alerts: {
    booked: true,
    rescheduled: true,
    status: true,
    updated: true,
    cancelled: true,
  },
}

/** Stored rows as settings: each key parsed, the default where it's missing or wrong */
export function readSettings(
  rows: { key: string; value: unknown }[]
): Settings {
  const out = { ...DEFAULT_SETTINGS }
  for (const key of SETTING_KEYS) {
    const row = rows.find((r) => r.key === key)
    const parsed = row && SETTING_SCHEMAS[key].safeParse(row.value)
    if (parsed?.success) Object.assign(out, { [key]: parsed.data })
  }
  return out
}

/** A value for a key, checked against its shape; null when it doesn't fit */
export function checkSetting<K extends SettingKey>(
  key: K,
  value: unknown
): Settings[K] | null {
  const parsed = SETTING_SCHEMAS[key].safeParse(value)
  return parsed.success ? (parsed.data as Settings[K]) : null
}

/** The Settings tabs, in the Configuration panel's order */
const SETTINGS_TABS = [
  "profile",
  "hours",
  "chairs",
  "procedures",
  "billing",
  "notifications",
] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

/** The tab a link asks for (`?tab=billing`), else My Profile */
export const readTab = (tab: string | string[] | undefined): SettingsTab =>
  SETTINGS_TABS.find((t) => t === tab) ?? "profile"

/** An hour as the Opens and Closes lists write it: "8:00 am", "12:00 pm" */
export function hourLabel(h: number) {
  const suffix = h < 12 ? "am" : "pm"
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`
}

/** Opens offers midnight to 10 pm; Closes the hours after opening, to 11 pm */
export const openingHours = Array.from({ length: 23 }, (_, h) => h)
export const closingHours = (open: number) =>
  Array.from({ length: 23 - open }, (_, i) => open + 1 + i)

/** Hours after a new opening: closing moves to an hour after it when the day would invert */
export const withOpening = (
  hours: { open: number; close: number },
  open: number
) => ({
  open,
  close: hours.close > open ? hours.close : open + 1,
})

export const TIME_ZONES = [
  "UTC-8 (Pacific Time)",
  "UTC-7 (Mountain Time)",
  "UTC-6 (Central Time)",
  "UTC-5 (Eastern Time)",
  "UTC+0 (London)",
  "UTC+1 (Berlin)",
  "UTC+9 (Tokyo)",
]

/** A typed price, checked as Save prices checks it; the number when it's good */
export function readPrice(text: string): { price: number } | { error: string } {
  const t = text.trim()
  if (!t) return { error: "Enter a price." }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { error: "Prices are numbers." }
  const price = Number(t)
  if (price < 0) return { error: "A price cannot be negative." }
  return { price }
}
