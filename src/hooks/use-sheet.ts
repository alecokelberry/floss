"use client"

import { useSyncExternalStore } from "react"

/**
 * The one sheet open over the app (opened from anywhere: a chip, a notification, a Search result): which
 * kind and which record. The app layout's `SheetHost` draws it; `openSheet` replaces any sheet already open.
 */
export type SheetRequest =
  | { kind: "booking"; id: number }
  | {
      kind: "new-booking"
      /** "visit" on the Staff page, which calls bookings visits */
      noun?: "booking" | "visit"
      defaults?: {
        patientId?: number
        practitionerId?: string
        procedureId?: string
        startsAt?: number
      }
    }
  | { kind: "edit-booking"; id: number; noun?: "booking" | "visit" }
  | { kind: "patient"; id: number }
  | { kind: "new-patient" }
  | { kind: "edit-patient"; id: number }
  | { kind: "message"; patientId: number }
  | { kind: "invoice"; key: string; edit?: boolean }
  | { kind: "new-invoice" }
  | { kind: "clinician"; id: string }
  | { kind: "new-clinician" }
  | { kind: "task"; id: number }
  | {
      kind: "new-task"
      defaults?: { startsAt?: number; allDay?: boolean; minutes?: number }
    }
  | { kind: "edit-task"; id: number }

let current: SheetRequest | null = null
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export function openSheet(request: SheetRequest) {
  current = request
  emit()
}

export function closeSheet() {
  current = null
  emit()
}

export function useSheet() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => null
  )
}
