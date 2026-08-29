import { describe, expect, it } from "vitest"

import { clinicDate } from "@/lib/dates"

import {
  agendaGroups,
  lastDay,
  moreAttendees,
  remindable,
  taskInput,
} from "./tasks"

const today = clinicDate(2026, 8, 28, 17)
const on = (d: number, h = 0, allDay = false) => ({
  startsAt: clinicDate(2026, 8, d, h),
  allDay,
})

const form = {
  title: "Introductory Call",
  category: "call",
  clinician: "Mara Ellison",
  patient: "Internal",
  allDay: false,
  startDate: "2026-09-28",
  endDate: "2026-09-28",
  from: "09:00",
  to: "10:00",
  reference: "",
  stage: "",
  status: "",
  priority: null,
  requirement: "",
  dueOn: "2026-09-28",
  workstream: null,
  room: "",
  note: "",
}

describe("tasks", () => {
  it("groups the agenda from today, all-day first, and names the days", () => {
    const groups = agendaGroups(
      [on(28, 13), on(27, 9), on(28, 0, true), on(29, 10), on(30, 9)],
      today
    )
    expect(groups.map((g) => g.label)).toEqual([
      "Today",
      "Tomorrow",
      "Wednesday, Sep 30",
    ])
    expect(groups[0]!.items.map((t) => t.allDay)).toEqual([true, false])
  })

  it("asks for a title and an end after the start", () => {
    expect(taskInput.safeParse(form).success).toBe(true)
    expect(
      taskInput.safeParse({ ...form, title: " " }).error?.issues[0]?.message
    ).toBe("Give the event a title.")
    expect(
      taskInput.safeParse({ ...form, to: "08:45" }).error?.issues[0]?.message
    ).toBe("End must be after start.")
    expect(
      taskInput.safeParse({ ...form, allDay: true, endDate: "2026-09-27" })
        .error?.issues[0]?.message
    ).toBe("The last day cannot precede the first.")
  })

  it("counts reminders, the last all-day day and the avatar overflow", () => {
    expect(
      remindable([{ patient: "Internal" }, { patient: "Katherine Chen" }])
    ).toBe(1)
    expect(lastDay({ endsAt: clinicDate(2026, 8, 30), allDay: true })).toEqual(
      clinicDate(2026, 8, 29)
    )
    expect([moreAttendees(9), moreAttendees(2)]).toEqual([6, 0])
  })
})
