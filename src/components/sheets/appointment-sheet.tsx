"use client"

import {
  BriefcaseMedicalIcon,
  CalendarRangeIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwClockIcon,
  Trash2Icon,
  UserIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useState, useTransition } from "react"

import { deleteBooking, loadBookingSheet } from "@/app/actions/bookings"
import { VerifyBadge, VerifyButton } from "@/components/front-desk/badges"
import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import { Dot } from "@/components/shared/dot"
import { StatusBadge } from "@/components/shared/tone-badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { useNow } from "@/hooks/use-now"
import { useRecord } from "@/hooks/use-record"
import { closeSheet, openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import {
  dayMonthYear,
  duration,
  startOfDay,
  timeRange,
  weekdayDate,
} from "@/lib/dates"
import { verification } from "@/lib/insurance"

import {
  SheetBody,
  SheetFooter,
  SheetFrame,
  SheetRow,
  SheetX,
} from "./sheet-frame"

/**
 * The appointment sheet: the patient and the booking's state, then what, who, when and where, the patient's
 * contacts and history. Delete asks first; Edit opens the booking form.
 */
export function AppointmentSheet({ id }: { id: number }) {
  // Verify writes from inside the sheet; the next revision reads the booking again
  const [revision, setRevision] = useState(0)
  const b = useRecord(loadBookingSheet, id, revision)
  const today = startOfDay(useNow())
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function cancelIt() {
    startTransition(async () => {
      const result = outcome(await deleteBooking(id))
      setConfirming(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      closeSheet()
      toast.add({ type: "success", title: result.message })
    })
  }

  return (
    <SheetFrame>
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3.5">
        {b ? (
          <PatientAvatar patient={b.patient} size={36} />
        ) : (
          <Skeleton className="size-9 rounded-full" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <SheetTitle className="min-w-0 shrink truncate text-lg leading-tight font-semibold">
              {b ? `${b.patient.firstName} ${b.patient.lastName}` : "Booking"}
            </SheetTitle>
            {b && <StatusBadge status={b.status} className="shrink-0" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {b?.patient.chart ?? (b === null ? "This booking is gone." : " ")}
          </p>
          <SheetDescription className="sr-only">
            Appointment details.
          </SheetDescription>
        </div>
        <SheetX className="self-start" />
      </div>
      <SheetBody>
        {b ? (
          <div className="flex flex-col gap-4 p-5">
            <SheetRow icon={BriefcaseMedicalIcon}>
              <p>
                {b.procedure.name}
                <span className="ms-2 font-mono text-xs text-muted-foreground">
                  {b.procedure.code}
                </span>
              </p>
            </SheetRow>
            <SheetRow icon={UserIcon}>
              <div className="flex min-w-0 items-center gap-2">
                <PractitionerAvatar practitioner={b.practitioner} size={24} />
                <span className="truncate">{b.practitioner.name}</span>
                <Dot />
                <span className="truncate text-xs text-muted-foreground">
                  {b.practitioner.specialty}
                </span>
              </div>
            </SheetRow>
            <SheetRow icon={ClockIcon}>
              <div>{weekdayDate(b.startsAt)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{timeRange(b.startsAt, b.endsAt)}</span>
                <Dot />
                <span>
                  {duration(
                    (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000
                  )}
                </span>
              </div>
            </SheetRow>
            {b.room && (
              <SheetRow icon={MapPinIcon}>
                <p>{b.room.name}</p>
              </SheetRow>
            )}
            <Separator />
            <SheetRow icon={PhoneIcon}>
              <a
                href={`tel:${b.patient.phone.replace(/[^\d+]/g, "")}`}
                className="underline-offset-2 hover:underline"
              >
                {b.patient.phone}
              </a>
            </SheetRow>
            <SheetRow icon={MailIcon}>
              <a
                href={`mailto:${b.patient.email}`}
                className="truncate underline-offset-2 hover:underline"
              >
                {b.patient.email}
              </a>
            </SheetRow>
            <SheetRow icon={ShieldCheckIcon}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <span className="truncate">
                    {b.patient.carrier ?? "Self-pay"}
                  </span>
                  {b.patient.carrier && (
                    <VerifyBadge state={verification(b.patient, today)} />
                  )}
                </div>
                {b.patient.carrier && (
                  <VerifyButton
                    patientId={b.patient.id}
                    name={`${b.patient.firstName} ${b.patient.lastName}`}
                    onDone={() => setRevision((r) => r + 1)}
                  />
                )}
              </div>
            </SheetRow>
            <SheetRow icon={CalendarRangeIcon}>
              <span className="flex flex-wrap items-center gap-x-1.5 tabular-nums">
                <span>{b.upcoming} upcoming</span>
                <Dot />
                <span>{b.total} total</span>
              </span>
            </SheetRow>
            <SheetRow icon={RotateCcwClockIcon}>
              <span className="text-muted-foreground">
                {b.lastSeen
                  ? `Last seen ${dayMonthYear(b.lastSeen)}`
                  : "Not seen yet"}
              </span>
            </SheetRow>
          </div>
        ) : (
          b === undefined && (
            <div className="flex flex-col gap-4 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-5 w-2/3" />
              ))}
            </div>
          )
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          variant="outline"
          className="me-auto"
          disabled={!b}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
        <Button
          disabled={!b}
          onClick={() => openSheet({ kind: "edit-booking", id })}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </SheetFooter>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel This Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              The slot returns to the board and the patient is not notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep It</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={cancelIt}>
              Cancel Appointment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SheetFrame>
  )
}
