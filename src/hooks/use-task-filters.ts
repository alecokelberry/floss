"use client"

import { useSyncExternalStore } from "react"

import type { TaskCategory } from "@/db/schema"
import { CATEGORIES, CLINICIANS } from "@/lib/tasks"

/**
 * The Appointments page's two filters, shared by the toolbar's menus and the Agenda panel's (toggling a
 * category in one moves the other's count). Kept for the visit; a reload shows everything again.
 */
type Filters = { categories: TaskCategory[]; clinicians: string[] }

let filters: Filters = { categories: CATEGORIES, clinicians: CLINICIANS }
const listeners = new Set<() => void>()

export function setTaskFilters(patch: Partial<Filters>) {
  filters = { ...filters, ...patch }
  for (const l of listeners) l()
}

const ALL: Filters = { categories: CATEGORIES, clinicians: CLINICIANS }

export function useTaskFilters() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => filters,
    () => ALL
  )
}

/** In one menu's order, with `item` on or off */
export function toggled<T>(
  all: readonly T[],
  on: T[],
  item: T,
  checked: boolean
) {
  return all.filter((x) => (x === item ? checked : on.includes(x)))
}
