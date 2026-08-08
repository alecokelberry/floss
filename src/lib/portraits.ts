// Everyone's portrait: Grok Imagine faces of no one, 256px JPEGs in public/avatars, one light and framing for the whole practice.
// A patient added in the app has none and keeps their initials.
import { DEMO_STAFF } from "@/lib/demo-account"

/** A practitioner's portrait, by their id ("chen") */
export const practitionerPhoto = (id: string) =>
  `/avatars/practitioners/${id}.jpg`

/** A seeded patient's portrait, by chart ("PT-2041"); patients added in the app (PT-3001 on) have none */
export function patientPhoto(chart: string) {
  const n = Number(chart.replace("PT-", ""))
  return n < 3000 ? `/avatars/patients/${n}.jpg` : undefined
}

/**
 * The planner's people (its clinicians and attendees), by name: the desk's own account, or a practitioner by their
 * last name ("Dr. Tomas Reyes" → reyes, as their ids are made)
 */
export function teamPhoto(name: string) {
  const staff = DEMO_STAFF.find((s) => s.name === name)
  if (staff) return staff.photo
  const last = name.split(/\s+/).at(-1)?.toLowerCase()
  return last ? practitionerPhoto(last) : undefined
}

/** Initials for a fallback: "Dr. Amara Chen" → "AC", "Wei Ling Tan" → "WT" */
export function initialsOf(name: string) {
  const words = name
    .replace(/^Dr\.\s+/, "")
    .split(/\s+/)
    .filter(Boolean)
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? words.at(-1)![0] : ""}`.toUpperCase()
}
