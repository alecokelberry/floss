"use client"

import { Trash2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { deleteTask, loadTask, saveTask } from "@/app/actions/tasks"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SheetClose } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { Task } from "@/db/queries/tasks"
import type { TaskCategory } from "@/db/schema"
import { useRecord } from "@/hooks/use-record"
import { closeSheet, type SheetRequest } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { dayOf, hhmm, TIME_OPTIONS, timeOf } from "@/lib/bookings"
import { CLINIC_TZ, isoDay, longDate, minuteOfDay } from "@/lib/dates"
import {
  CATEGORIES,
  CLINICIANS,
  INTERNAL,
  lastDay,
  PRIORITIES,
  type TaskInput,
  taskInput,
  WORKSTREAMS,
} from "@/lib/tasks"
import { TASK_CATEGORY } from "@/lib/tones"

import {
  SheetBody,
  SheetFooter,
  SheetFormHeader,
  SheetFrame,
} from "./sheet-frame"
import { DeleteTaskDialog } from "./task-sheet"

type Defaults = Extract<SheetRequest, { kind: "new-task" }>["defaults"]
type Draft = Omit<TaskInput, "startDate" | "endDate" | "dueOn"> & {
  start: Date
  end: Date
  due: Date
}

/** The New and Edit Appointment: one form; Create or Save validates, toasts and closes */
export function TaskForm({
  editId,
  defaults,
}: {
  editId?: number
  defaults?: Defaults
}) {
  const task = useRecord(loadTask, editId)
  const editing = editId !== undefined
  return (
    <SheetFrame>
      <SheetFormHeader
        title={editing ? "Edit Appointment" : "New Appointment"}
        description={
          editing
            ? "Update this appointment."
            : "Add an appointment to the practice calendar."
        }
      />
      {editing && !task ? (
        <SheetBody>
          <div className="flex flex-col gap-5 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </SheetBody>
      ) : (
        <Fields
          key={task?.id ?? "new"}
          task={task ?? undefined}
          defaults={defaults}
        />
      )}
    </SheetFrame>
  )
}

function Fields({ task, defaults }: { task?: Task; defaults?: Defaults }) {
  const { renderedAt, patients } = usePractice()
  const [initial] = useState<Draft>(() => {
    if (task)
      return {
        title: task.title,
        category: task.category,
        clinician: task.clinician,
        patient: task.patient,
        allDay: task.allDay,
        start: task.startsAt,
        end: lastDay(task),
        from: task.allDay ? "09:00" : timeOf(task.startsAt),
        to: task.allDay ? "10:00" : timeOf(task.endsAt),
        reference: task.reference ?? "",
        stage: task.stage ?? "",
        status: task.status ?? "",
        priority: task.priority,
        requirement: task.requirement === "Unassigned" ? "" : task.requirement,
        due: dayOf(task.dueOn),
        workstream: task.workstream,
        room: task.room ?? "",
        note: task.note ?? "",
      }
    const at = new Date(defaults?.startsAt ?? renderedAt)
    const timed = defaults?.startsAt !== undefined && !defaults.allDay
    const fromMinutes = timed ? minuteOfDay(at) : 9 * 60
    return {
      title: "",
      category: "task",
      clinician: CLINICIANS[0] ?? "",
      patient: INTERNAL,
      allDay: defaults?.allDay ?? false,
      start: at,
      end: at,
      from: hhmm(fromMinutes),
      to: hhmm(Math.min(24 * 60 - 15, fromMinutes + (defaults?.minutes ?? 60))),
      reference: "",
      stage: "",
      status: "",
      priority: null,
      requirement: "",
      due: at,
      workstream: null,
      room: "",
      note: "",
    }
  })
  const [d, setD] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch }
    setD(next)
    // Errors clear as the value is fixed
    if (Object.keys(errors).length) setErrors(check(next) ?? {})
  }

  function input(draft: Draft): TaskInput {
    return {
      ...draft,
      startDate: isoDay(draft.start),
      endDate: isoDay(draft.end),
      dueOn: isoDay(draft.due),
    }
  }
  function check(draft: Draft) {
    const parsed = taskInput.safeParse(input(draft))
    if (parsed.success) return null
    return Object.fromEntries(
      parsed.error.issues.map((i) => [String(i.path[0]), i.message])
    )
  }

  function save() {
    const found = check(d)
    if (found) {
      setErrors(found)
      titleRef.current?.focus()
      return
    }
    startTransition(async () => {
      const result = outcome(
        await saveTask({ id: task?.id ?? null, input: input(d) })
      )
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: result.message,
        description: "Saved to the practice calendar.",
      })
    })
  }

  function remove() {
    if (!task) return
    startTransition(async () => {
      const result = outcome(await deleteTask(task.id))
      setConfirming(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({
        type: "success",
        title: result.message,
        description: "Taken off the practice calendar.",
      })
    })
  }

  return (
    <>
      <SheetBody>
        <form
          id="task-form"
          noValidate
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldGroup className="gap-5">
            <Field data-invalid={errors.title ? true : undefined}>
              <FieldLabel htmlFor="event-title">Title</FieldLabel>
              <Input
                id="event-title"
                ref={titleRef}
                placeholder="Introductory Call"
                value={d.title}
                onChange={(e) => set({ title: e.target.value })}
              />
              {errors.title && (
                <FieldError role="alert">{errors.title}</FieldError>
              )}
            </Field>
            <div className="flex gap-3">
              <Pick
                label="Category"
                id="event-kind"
                value={d.category}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: TASK_CATEGORY[c].label,
                }))}
                onChange={(v) => set({ category: v as TaskCategory })}
              />
              <Pick
                label="Clinician"
                id="event-owner"
                value={d.clinician}
                options={CLINICIANS.map((c) => ({ value: c, label: c }))}
                onChange={(v) => set({ clinician: v })}
              />
            </div>
            <Pick
              label="Patient"
              id="event-patientAccount"
              value={d.patient}
              options={[
                INTERNAL,
                ...patients.map((p) => `${p.firstName} ${p.lastName}`),
                ...(task && task.patient !== INTERNAL ? [task.patient] : []),
              ]
                .filter((name, i, all) => all.indexOf(name) === i)
                .map((p) => ({ value: p, label: p }))}
              onChange={(v) => set({ patient: v })}
            />
            <Field orientation="horizontal" className="justify-between">
              <FieldLabel htmlFor="event-all-day">All day</FieldLabel>
              <Switch
                id="event-all-day"
                checked={d.allDay}
                onCheckedChange={(allDay) => set({ allDay })}
              />
            </Field>
            <div className="flex gap-3">
              <DateField
                label="Starts"
                id="event-start-date"
                value={d.start}
                onChange={(start) =>
                  set({ start, end: d.end < start ? start : d.end })
                }
              />
              <DateField
                label="Ends"
                id="event-end-date"
                value={d.end}
                error={errors.endDate}
                onChange={(end) => set({ end })}
              />
            </div>
            {!d.allDay && (
              <div className="flex gap-3">
                <Pick
                  label="From"
                  id="event-start-time"
                  value={d.from}
                  options={TIME_OPTIONS}
                  onChange={(from) => set({ from })}
                />
                <Pick
                  label="To"
                  id="event-end-time"
                  value={d.to}
                  options={TIME_OPTIONS}
                  error={errors.to}
                  onChange={(to) => set({ to })}
                />
              </div>
            )}
            <Separator />
            <div className="flex gap-3">
              <Text
                label="Reference"
                id="event-reference"
                placeholder="PT-40218"
                value={d.reference}
                onChange={(reference) => set({ reference })}
              />
              <Text
                label="Stage"
                id="event-stage"
                placeholder="1 - Consultation"
                value={d.stage}
                onChange={(stage) => set({ stage })}
              />
            </div>
            <div className="flex gap-3">
              <Text
                label="Status"
                id="event-status"
                placeholder="Requested"
                value={d.status}
                onChange={(status) => set({ status })}
                className="flex-[2]"
              />
              <Pick
                label="Priority"
                id="event-priority"
                value={d.priority ?? ""}
                placeholder="None"
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                onChange={(p) =>
                  set({ priority: (p || null) as Draft["priority"] })
                }
              />
            </div>
            <div className="flex gap-3">
              <Text
                label="Requirement"
                id="event-obligation"
                placeholder="Pre-Authorization"
                value={d.requirement}
                onChange={(requirement) => set({ requirement })}
              />
              <DateField
                label="Due"
                id="event-due"
                value={d.due}
                onChange={(due) => set({ due })}
              />
            </div>
            <div className="flex gap-3">
              <Pick
                label="Workstream"
                id="event-workstream"
                value={d.workstream ?? ""}
                placeholder="None"
                options={WORKSTREAMS.map((w) => ({ value: w, label: w }))}
                onChange={(w) =>
                  set({ workstream: (w || null) as Draft["workstream"] })
                }
              />
              <Text
                label="Room"
                id="event-place"
                placeholder="Op 3"
                value={d.room}
                onChange={(room) => set({ room })}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="event-note">Note</FieldLabel>
              <Textarea
                id="event-note"
                placeholder="Context for the clinical team"
                value={d.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </Field>
          </FieldGroup>
        </form>
      </SheetBody>
      <SheetFooter className="justify-end">
        {task && (
          <Button
            variant="outline"
            className="me-auto"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        )}
        <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        <Button type="submit" form="task-form" disabled={pending}>
          {task ? "Save" : "Create appointment"}
        </Button>
      </SheetFooter>
      <DeleteTaskDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={pending}
        onDelete={remove}
      />
    </>
  )
}

function Text({
  label,
  id,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string
  id: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Field className={className ?? "min-w-0 flex-1"}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function Pick({
  label,
  id,
  value,
  options,
  onChange,
  placeholder,
  error,
}: {
  label: string
  id: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <Field className="min-w-0 flex-1" data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={value || null}
        onValueChange={(v) => onChange(v ?? "")}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <FieldError role="alert">{error}</FieldError>}
    </Field>
  )
}

function DateField({
  label,
  id,
  value,
  onChange,
  error,
}: {
  label: string
  id: string
  value: Date
  onChange: (value: Date) => void
  error?: string
}) {
  return (
    <Field className="min-w-0 flex-1" data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              className="w-full justify-start font-normal"
            />
          }
        >
          {longDate(value)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            timeZone={CLINIC_TZ}
            required
            selected={value}
            defaultMonth={value}
            onSelect={onChange}
          />
        </PopoverContent>
      </Popover>
      {error && <FieldError role="alert">{error}</FieldError>}
    </Field>
  )
}
