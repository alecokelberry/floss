"use client"

import { createContext, use } from "react"

import type { PatientOption } from "@/db/queries/calendar"
import type { Practitioner } from "@/db/queries/shell"
import type { ClockState } from "@/lib/clock"
import type { Settings } from "@/lib/settings"

type Practice = {
  me: { name: string; email: string }
  practitioners: Practitioner[]
  /** Everyone bookable, and the catalog a booking picks from */
  patients: PatientOption[]
  procedures: {
    id: string
    code: string
    name: string
    minutes: number
    price: number
    listPrice: number
  }[]
  rooms: { id: string; name: string }[]
  settings: Settings
  clock: ClockState
  /** The clinic's time when the server rendered, so the first client render matches it */
  renderedAt: number
}

const PracticeContext = createContext<Practice | null>(null)

/** What every page of the app shares, loaded once by the app layout */
export function PracticeProvider({
  children,
  ...value
}: Practice & { children: React.ReactNode }) {
  return <PracticeContext value={value}>{children}</PracticeContext>
}

export function usePractice() {
  const practice = use(PracticeContext)
  if (!practice) throw new Error("usePractice needs the app layout")
  return practice
}
