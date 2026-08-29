"use client"

import { PlusIcon, SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { Task } from "@/db/queries/tasks"
import { openSheet } from "@/hooks/use-sheet"
import { useTaskFilters } from "@/hooks/use-task-filters"
import type { PlannerView } from "@/lib/calendar"
import {
  addDays,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates"
import { remindable } from "@/lib/tasks"
import { TASK_CATEGORY } from "@/lib/tones"

/** The header's stack of the selected categories' colors: four, then "+ N" */
export function CategoryDots() {
  const { categories } = useTaskFilters()
  return (
    <div className="hidden items-center *:not-first:-ms-1.5 md:flex">
      {categories.slice(0, 4).map((c) => (
        <span
          key={c}
          className="size-3.5 rounded-full border-2 border-background"
          style={{ backgroundColor: TASK_CATEGORY[c].color }}
        />
      ))}
      {categories.length > 4 && (
        <span className="flex size-3.5 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium text-foreground">
          +{categories.length - 4}
        </span>
      )}
    </div>
  )
}

/** The days a view shows around a date */
function inView(date: Date, view: PlannerView): [Date, Date] {
  if (view === "day") return [startOfDay(date), addDays(startOfDay(date), 1)]
  if (view === "agenda")
    return [startOfDay(date), addDays(startOfDay(date), 30)]
  if (view === "month")
    return [startOfMonth(date), addDays(endOfMonth(date), 1)]
  const start = startOfWeek(date, 1)
  return [start, addDays(start, 7)]
}

/** Send reminders (a toast: nothing is sent yet) and New Appointment at 9:00 today */
export function AppointmentsActions({
  date,
  view,
  tasks,
}: {
  date: Date
  view: PlannerView
  tasks: Task[]
}) {
  const { categories, clinicians } = useTaskFilters()
  function remind() {
    const [from, to] = inView(date, view)
    const n = remindable(
      tasks.filter(
        (t) =>
          categories.includes(t.category) &&
          clinicians.includes(t.clinician) &&
          t.startsAt < to &&
          t.endsAt > from
      )
    )
    toast.add({
      type: "success",
      title: "Reminders ready",
      description: `${n} ${n === 1 ? "patient" : "patients"} in view. Connect this action to your practice management API.`,
    })
  }
  return (
    <>
      <Button
        variant="outline"
        aria-label="Send reminders to everyone in view"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={remind}
      >
        <SendIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Send reminders</span>
      </Button>
      <Button
        aria-label="New appointment"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={() => openSheet({ kind: "new-task" })}
      >
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">New Appointment</span>
      </Button>
    </>
  )
}
