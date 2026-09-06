"use client"

import { FunnelIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type BoardState, STAFF_FILTERS } from "@/lib/staff"

type Filter = BoardState | "everything"

// The header's filter and the board share it; a reload shows everything again
let current: Filter = "everything"
const listeners = new Set<() => void>()

export function useStaffFilter() {
  const filter = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => "everything"
  )
  const set = (next: Filter) => {
    current = next
    for (const l of listeners) l()
  }
  return [filter, set] as const
}

/** The header's Filters: one status at a time, its name on the trigger */
export function StaffFilter() {
  const [filter, setFilter] = useStaffFilter()
  const label =
    filter === "everything"
      ? "Filters"
      : STAFF_FILTERS.find((f) => f.value === filter)?.label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            aria-label="Filter the board by status"
            className="has-data-[icon=inline-start]:pl-2.5"
          />
        }
      >
        <FunnelIcon data-icon="inline-start" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {STAFF_FILTERS.map((f) => (
            <DropdownMenuItem key={f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
