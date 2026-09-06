"use client"

import {
  CalendarClockIcon,
  PencilIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useState, useTransition } from "react"

import { deleteInvoice, loadInvoice, saveInvoice } from "@/app/actions/payments"
import { PatientAvatar } from "@/components/shared/avatars"
import { ToneBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { IconTile } from "@/components/ui/icon-tile"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { LedgerInvoice } from "@/db/queries/payments"
import { useRecord } from "@/hooks/use-record"
import { closeSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { monthDay } from "@/lib/dates"
import { ageing, INVOICE_STATUS, money } from "@/lib/invoices"
import { INVOICE_TONE } from "@/lib/tones"

const patientName = (i: LedgerInvoice) =>
  `${i.lines[0].patient.firstName} ${i.lines[0].patient.lastName}`

/** Send reminder / Remind: nothing goes out yet, the toast says who would be reminded */
export function remind(i: LedgerInvoice) {
  toast.add({
    type: "success",
    title: "Reminder sent",
    description: `${patientName(i)} was reminded about ${i.number}.`,
  })
}

/** Deleting an invoice takes the treatment it billed off the diary too, so it asks first */
export function DeleteInvoiceDialog({
  invoice: i,
  open,
  onOpenChange,
  onDeleted,
}: {
  invoice: LedgerInvoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const [pending, startTransition] = useTransition()
  function remove() {
    startTransition(async () => {
      const result = outcome(await deleteInvoice(i.key))
      onOpenChange(false)
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      onDeleted?.()
      toast.add({
        type: "success",
        title: "Invoice deleted",
        description: result.message,
      })
    })
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete This Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            {i.number} bills the {i.treatment.toLowerCase()}{" "}
            {i.lines[0].practitioner.name} carried out for {patientName(i)} on{" "}
            {monthDay(i.issued)}. The ledger is a reading of the calendar, so
            deleting the bill removes that treatment from the diary as well.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep It</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={remove}>
            Delete Invoice and Treatment
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The invoice sheet: flush to the right edge, 420 wide. Who and the standing, the amount and treatment, the facts,
 * where it came from; Edit sets each line's fee and whether it's settled (the booking follows).
 */
export function InvoiceSheet({
  invoiceKey,
  edit,
}: {
  invoiceKey: string
  edit?: boolean
}) {
  const { renderedAt } = usePractice()
  const [revision, setRevision] = useState(0)
  const i = useRecord(loadInvoice, invoiceKey, revision)
  const [editing, setEditing] = useState(Boolean(edit))
  const [confirming, setConfirming] = useState(false)
  const today = new Date(renderedAt)

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm">{value}</span>
    </div>
  )

  return (
    <SheetContent
      side="right"
      showCloseButton={false}
      className="w-[420px]! max-w-none! gap-0 bg-card p-0"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <SheetTitle className="text-base font-semibold">
          {i?.number ?? "Invoice"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {i ? `${patientName(i)}, ${money(i.amount)}` : "Invoice details."}
        </SheetDescription>
        <SheetClose
          render={<Button variant="ghost" size="icon-sm" className="-me-1" />}
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>
      {i && editing ? (
        <EditInvoice
          invoice={i}
          onDone={() => {
            setEditing(false)
            setRevision((r) => r + 1)
          }}
        />
      ) : (
        <>
          <ScrollArea className="min-h-0 flex-1">
            {i ? (
              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="flex items-center gap-3">
                  <PatientAvatar patient={i.lines[0].patient} size={40} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {patientName(i)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {i.lines[0].patient.chart}
                    </span>
                  </div>
                  <ToneBadge tone={INVOICE_TONE[i.status]}>
                    {INVOICE_STATUS[i.status]}
                  </ToneBadge>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <IconTile
                    variant="elevated"
                    className="size-8 rounded-lg bg-accent text-foreground [&_svg]:size-4"
                  >
                    <ReceiptTextIcon />
                  </IconTile>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-xl font-semibold tabular-nums">
                      {money(i.amount)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {i.treatment}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col">
                  {row("Invoice", i.number)}
                  {row("Treatment", i.treatment)}
                  {row("CDT", i.codes)}
                  {row("Clinician", i.lines[0].practitioner.name)}
                  {row("Issued", monthDay(i.issued))}
                  {row("Due", monthDay(i.due))}
                  {i.status === "paid"
                    ? row("Settled", monthDay(i.issued))
                    : row("Ageing", ageing(i, today))}
                </div>
                <div className="flex gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                  <CalendarClockIcon className="size-3.5 shrink-0" />
                  Raised from the {i.treatment.toLowerCase()} on{" "}
                  {monthDay(i.issued)}
                </div>
              </div>
            ) : (
              i === undefined && (
                <div className="flex flex-col gap-3 p-4">
                  {[0, 1, 2, 3].map((n) => (
                    <Skeleton key={n} className="h-6 w-2/3" />
                  ))}
                </div>
              )
            )}
          </ScrollArea>
          <div className="flex shrink-0 items-center gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              className="me-auto"
              disabled={!i}
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
            {i && i.status !== "paid" && (
              <Button variant="outline" onClick={() => remind(i)}>
                <SendIcon data-icon="inline-start" />
                Remind
              </Button>
            )}
            <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
            <Button disabled={!i} onClick={() => setEditing(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          </div>
        </>
      )}
      {i && (
        <DeleteInvoiceDialog
          invoice={i}
          open={confirming}
          onOpenChange={setConfirming}
          onDeleted={closeSheet}
        />
      )}
    </SheetContent>
  )
}

/** A bare fee as the sheet reads it: "12.5" is $12.50, anything else ("1,200", "abc") is $0 */
const feeOf = (text: string) => {
  const n = Number(text)
  return Number.isFinite(n) && text.trim() !== "" ? n : 0
}

function EditInvoice({
  invoice: i,
  onDone,
}: {
  invoice: LedgerInvoice
  onDone: () => void
}) {
  const [fees, setFees] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      i.lines.map((l) => [l.id, String(l.fee ?? l.procedure.price)])
    )
  )
  const [settled, setSettled] = useState(i.status === "paid")
  const [pending, startTransition] = useTransition()
  const total = i.lines.reduce((t, l) => t + feeOf(fees[l.id] ?? ""), 0)

  function save() {
    startTransition(async () => {
      const result = outcome(
        await saveInvoice({
          key: i.key,
          input: {
            fees: i.lines.map((l) => ({
              bookingId: l.id,
              fee: feeOf(fees[l.id] ?? ""),
            })),
            settled,
          },
        })
      )
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      toast.add({
        type: "success",
        title: "Invoice updated",
        description: result.message,
      })
      onDone()
    })
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <form
          id="invoice-form"
          className="flex flex-col gap-4 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldGroup className="gap-4">
            {i.lines.map((l, n) => (
              <Field key={l.id}>
                <FieldLabel
                  htmlFor={`invoice-fee-${l.id}`}
                  className="text-xs font-medium"
                >
                  {i.lines.length > 1
                    ? `${n + 1}. ${l.procedure.name}`
                    : l.procedure.name}
                </FieldLabel>
                <Input
                  id={`invoice-fee-${l.id}`}
                  name={`chairs.${n}.fee`}
                  inputMode="decimal"
                  value={fees[l.id] ?? ""}
                  onChange={(e) => setFees({ ...fees, [l.id]: e.target.value })}
                />
              </Field>
            ))}
          </FieldGroup>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="invoice-settled" className="text-sm font-medium">
                Settled
              </label>
              <span className="text-xs text-muted-foreground">
                On when the money is in; off while it is still owed.
              </span>
            </div>
            <Switch
              id="invoice-settled"
              checked={settled}
              onCheckedChange={setSettled}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Invoice total</span>
            <span className="text-xl font-semibold tabular-nums">
              {money(total)}
            </span>
          </div>
        </form>
      </ScrollArea>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" form="invoice-form" disabled={pending}>
          Save changes
        </Button>
      </div>
    </>
  )
}
