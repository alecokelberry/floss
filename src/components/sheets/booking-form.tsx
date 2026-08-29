"use client"

import { useState, useTransition } from "react"

import { loadBookingSheet, saveBooking } from "@/app/actions/bookings"
import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import { StatusBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
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
import { SheetClose } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { BookingSheet, PatientOption } from "@/db/queries/calendar"
import { BOOKING_STATUSES, type BookingStatus } from "@/db/schema"
import { useRecord } from "@/hooks/use-record"
import { closeSheet, type SheetRequest } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { hhmm, minutesOf, TIME_OPTIONS, timeOf } from "@/lib/bookings"
import { atMinute, CLINIC_TZ, isoDay, longDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

import {
  SheetBody,
  SheetFooter,
  SheetFormHeader,
  SheetFrame,
} from "./sheet-frame"

type Defaults = Extract<SheetRequest, { kind: "new-booking" }>["defaults"]

type Draft = {
  patient: PatientOption | null
  procedureId: string
  practitionerId: string
  date: Date
  start: string
  end: string
  status: BookingStatus
  room: string
  note: string
}

/**
 * The New Booking and Edit Booking: one form. Patient (searchable), procedure, practitioner, the day, start and
 * end by the quarter hour, status, room and a note. A new procedure or start keeps the booking's length in step;
 * Save without a patient asks for one.
 */
export function BookingForm({
  editId,
  defaults,
  noun = "booking",
}: {
  editId?: number
  defaults?: Defaults
  noun?: "booking" | "visit"
}) {
  const booking = useRecord(loadBookingSheet, editId)
  const editing = editId !== undefined
  return (
    <SheetFrame>
      <SheetFormHeader
        title={
          noun === "visit"
            ? editing
              ? "Edit visit"
              : "New visit"
            : editing
              ? "Edit Booking"
              : "New Booking"
        }
        description={
          editing ? `Update this ${noun}.` : "Book a chair for a patient."
        }
      />
      {editing && !booking ? (
        <SheetBody>
          <div className="flex flex-col gap-5 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </SheetBody>
      ) : (
        <Fields
          key={booking?.id ?? "new"}
          editId={editId}
          booking={booking ?? undefined}
          defaults={defaults}
        />
      )}
    </SheetFrame>
  )
}

function Fields({
  editId,
  booking,
  defaults,
}: {
  editId?: number
  booking?: BookingSheet
  defaults?: Defaults
}) {
  const { patients, procedures, practitioners, renderedAt } = usePractice()
  const minutesFor = (id: string) =>
    procedures.find((p) => p.id === id)?.minutes ?? 30
  const [initial] = useState<Draft>(() => {
    if (booking)
      return {
        patient:
          patients.find((p) => p.id === booking.patientId) ?? booking.patient,
        procedureId: booking.procedureId,
        practitionerId: booking.practitionerId,
        date: booking.startsAt,
        start: timeOf(booking.startsAt),
        end: timeOf(booking.endsAt),
        status: booking.status,
        room: booking.room?.name ?? "",
        note: booking.note ?? "",
      }
    const procedureId = defaults?.procedureId ?? "checkup"
    const at =
      defaults?.startsAt === undefined
        ? atMinute(renderedAt, 9 * 60)
        : new Date(defaults.startsAt)
    const start = timeOf(at)
    return {
      patient: patients.find((p) => p.id === defaults?.patientId) ?? null,
      procedureId,
      practitionerId: defaults?.practitionerId ?? practitioners[0]?.id ?? "",
      date: at,
      start,
      end: hhmm(minutesOf(start) + minutesFor(procedureId)),
      status: "booked",
      room: "",
      note: "",
    }
  })
  const [d, setD] = useState(initial)
  const [missing, setMissing] = useState(false)
  const [errors, setErrors] = useState<{
    practitionerId?: string
    end?: string
  }>({})
  const [dateOpen, setDateOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })
  const length = minutesOf(d.end) - minutesOf(d.start)
  const dirty = JSON.stringify(d) !== JSON.stringify(initial)

  function save() {
    setErrors({})
    if (!d.patient) {
      setMissing(true)
      return
    }
    const patientId = d.patient.id
    startTransition(async () => {
      const result = outcome(
        await saveBooking({
          id: editId ?? null,
          input: {
            patientId,
            procedureId: d.procedureId,
            practitionerId: d.practitionerId,
            date: isoDay(d.date),
            start: d.start,
            end: d.end,
            status: d.status,
            room: d.room,
            note: d.note,
          },
        })
      )
      if (!result.ok) {
        // The two a form can point at go under their field; anything else is a toast
        if (result.error.startsWith("Overlaps"))
          setErrors({ practitionerId: result.error })
        else if (result.error.startsWith("End"))
          setErrors({ end: result.error })
        else
          toast.add({
            type: "error",
            title: "Couldn't save",
            description: result.error,
          })
        return
      }
      closeSheet()
    })
  }

  return (
    <>
      <SheetBody>
        <form
          id="booking-form"
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldGroup className="gap-5">
            <Field data-invalid={missing || undefined}>
              <FieldLabel htmlFor="booking-patient">Patient</FieldLabel>
              <Combobox
                items={patients}
                value={d.patient}
                onValueChange={(p) => {
                  setMissing(false)
                  set({ patient: p })
                }}
                itemToStringLabel={(p: PatientOption) =>
                  `${p.firstName} ${p.lastName}`
                }
                isItemEqualToValue={(a: PatientOption, b: PatientOption) =>
                  a.id === b.id
                }
              >
                <ComboboxInput
                  id="booking-patient"
                  placeholder="Search patients..."
                  aria-invalid={missing || undefined}
                  className="w-full"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No patients found.</ComboboxEmpty>
                  <ComboboxList>
                    {(p: PatientOption) => (
                      <ComboboxItem key={p.id} value={p} className="py-1.5">
                        <PatientAvatar patient={p} size={24} />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {p.chart}
                          </span>
                        </div>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {missing && <FieldError>Choose a patient.</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Procedure</FieldLabel>
              <Select
                items={procedures.map((p) => ({ value: p.id, label: p.name }))}
                value={d.procedureId}
                onValueChange={(v) => {
                  const id = v as string
                  set({
                    procedureId: id,
                    end: hhmm(minutesOf(d.start) + minutesFor(id)),
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="w-11 font-mono text-xs text-muted-foreground">
                          {p.code}
                        </span>
                        <span className="flex-1">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.minutes} m
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={errors.practitionerId ? true : undefined}>
              <FieldLabel>Practitioner</FieldLabel>
              <Select
                value={d.practitionerId}
                onValueChange={(v) => set({ practitionerId: v as string })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(id: string) => {
                      const p = practitioners.find((x) => x.id === id)
                      return (
                        p && (
                          <span className="flex min-w-0 items-center gap-2">
                            <PractitionerAvatar practitioner={p} size={20} />
                            <span className="truncate">{p.name}</span>
                          </span>
                        )
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {practitioners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <PractitionerAvatar practitioner={p} size={20} />
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.practitionerId && (
                <FieldError>{errors.practitionerId}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Date</FieldLabel>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  {longDate(d.date)}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    timeZone={CLINIC_TZ}
                    selected={d.date}
                    defaultMonth={d.date}
                    onSelect={(day) => {
                      if (day) set({ date: day })
                      setDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <div className="flex gap-3">
              <TimeField
                label="Start"
                value={d.start}
                onChange={(start) =>
                  set({
                    start,
                    end: hhmm(Math.min(1440 - 15, minutesOf(start) + length)),
                  })
                }
              />
              <TimeField
                label="End"
                value={d.end}
                error={errors.end}
                onChange={(end) => set({ end })}
              />
            </div>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={d.status}
                onValueChange={(v) => set({ status: v as BookingStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(s: BookingStatus) => (
                      <StatusBadge status={s} size="default" />
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <StatusBadge status={s} size="default" />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="booking-room">Room</FieldLabel>
              <Input
                id="booking-room"
                placeholder="Op 1"
                value={d.room}
                onChange={(e) => set({ room: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="booking-note">Note</FieldLabel>
              <Textarea
                id="booking-note"
                placeholder="Note for the chairside team"
                value={d.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </Field>
          </FieldGroup>
        </form>
      </SheetBody>
      <SheetFooter className="justify-end">
        <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        <Button
          type="submit"
          form="booking-form"
          disabled={pending}
          className={cn(editId !== undefined && !dirty && "opacity-80")}
        >
          Save
        </Button>
      </SheetFooter>
    </>
  )
}

function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <Field className="min-w-0 flex-1" data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={TIME_OPTIONS}
        value={value}
        onValueChange={(v) => onChange(v as string)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {TIME_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
