"use client"

import { useState } from "react"

import { InvoiceWizard } from "@/components/payments/invoice-wizard"
import { Sheet } from "@/components/ui/sheet"
import { closeSheet, useSheet } from "@/hooks/use-sheet"

import { AppointmentSheet } from "./appointment-sheet"
import { BookingForm } from "./booking-form"
import { ClinicianSheet, NewClinicianSheet } from "./clinician-sheet"
import { InvoiceSheet } from "./invoice-sheet"
import { MessageDialog } from "./message-dialog"
import { PatientForm } from "./patient-form"
import { PatientSheet } from "./patient-sheet"
import { TaskForm } from "./task-form"
import { TaskSheet } from "./task-sheet"

/**
 * The one sheet over the app, whatever opened it (a chip, a panel row, the bell, Search): a booking, patient,
 * clinician, invoice or planner entry, or its New and Edit form; the New invoice wizard and the message dialog. Opening
 * another replaces it.
 */
export function SheetHost() {
  const request = useSheet()
  // The last sheet asked for stays drawn while it slides out
  const [shown, setShown] = useState(request)
  if (request && request !== shown) setShown(request)
  // The wizard and the message dialog are dialogs of their own; everything else is drawn in the one Sheet
  const open =
    request !== null &&
    request.kind !== "new-invoice" &&
    request.kind !== "message"
  const messaging = request?.kind === "message" ? request.patientId : null
  // The invoice sheet has its own frame (flush right, 420 wide), so it draws its own content
  const invoicing = shown?.kind === "invoice" ? shown : null
  return (
    <>
      {request?.kind === "new-invoice" && (
        <InvoiceWizard key="new-invoice" onClose={closeSheet} />
      )}
      {messaging !== null && (
        <MessageDialog
          key={messaging}
          patientId={messaging}
          open
          onOpenChange={(o) => !o && closeSheet()}
        />
      )}
      <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
        {shown?.kind === "booking" && (
          <AppointmentSheet key={shown.id} id={shown.id} />
        )}
        {shown?.kind === "new-booking" && (
          <BookingForm key="new" defaults={shown.defaults} noun={shown.noun} />
        )}
        {shown?.kind === "edit-booking" && (
          <BookingForm
            key={`edit-${shown.id}`}
            editId={shown.id}
            noun={shown.noun}
          />
        )}
        {shown?.kind === "task" && <TaskSheet key={shown.id} id={shown.id} />}
        {shown?.kind === "new-task" && (
          <TaskForm key="new-task" defaults={shown.defaults} />
        )}
        {shown?.kind === "edit-task" && (
          <TaskForm key={`edit-task-${shown.id}`} editId={shown.id} />
        )}
        {shown?.kind === "patient" && (
          <PatientSheet key={shown.id} id={shown.id} />
        )}
        {shown?.kind === "new-patient" && <PatientForm key="new-patient" />}
        {invoicing && (
          <InvoiceSheet
            key={invoicing.key}
            invoiceKey={invoicing.key}
            edit={invoicing.edit}
          />
        )}
        {shown?.kind === "clinician" && (
          <ClinicianSheet key={shown.id} id={shown.id} />
        )}
        {shown?.kind === "new-clinician" && (
          <NewClinicianSheet key="new-clinician" />
        )}
        {shown?.kind === "edit-patient" && (
          <PatientForm key={`edit-patient-${shown.id}`} editId={shown.id} />
        )}
      </Sheet>
    </>
  )
}
