"use client"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HashIcon,
  PlusIcon,
  ReceiptIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { nextInvoiceNumber, raiseInvoice } from "@/app/actions/payments"
import { Portrait } from "@/components/shared/avatars"
import { ToneBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
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
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import type { PatientOption } from "@/db/queries/calendar"
import { outcome } from "@/lib/action-result"
import { addDays, CLINIC_TZ, isoDay, paddedDate } from "@/lib/dates"
import {
  money,
  moneyCents,
  type WizardLine,
  wizardTotals,
} from "@/lib/invoices"
import { PATIENT_STAGE } from "@/lib/tones"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    title: "Patient",
    description: "Who is being billed, and the invoice reference.",
  },
  {
    title: "Treatment",
    description: "The procedures carried out, priced from the list.",
  },
  {
    title: "Tax And Discount",
    description: "Set the discount and confirm per-line tax.",
  },
  {
    title: "Review And Send",
    description: "Confirm the invoice, then send it to the patient.",
  },
]
const CURRENCIES = { USD: "$", EUR: "€", GBP: "£" } as const
const TERMS = ["Due on receipt", "Net 7", "Net 14", "Net 30"]
const COLLECTION = [
  "Card at reception",
  "Bank transfer",
  "Cash at reception",
  "Claim to insurer",
]
const TAXES = [
  { value: "0", label: "No tax" },
  { value: "5", label: "5%" },
  { value: "8.25", label: "8.25%" },
  { value: "10", label: "10%" },
]

/** A line as the form holds it: its own key while it's edited */
type Line = WizardLine & { uid: string }

const name = (p: PatientOption) => `${p.firstName} ${p.lastName}`
const clampQty = (n: number) =>
  Number.isFinite(n) && n >= 1 ? Math.round(n) : 1
const clampRate = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/**
 * The New invoice: a Stepper through the patient and terms, the lines, tax and discount, and a review. Send
 * raises it for real: each line becomes an Unpaid booking for the patient's clinician on the issue date.
 */
export function InvoiceWizard({ onClose }: { onClose: () => void }) {
  const { patients, practitioners, procedures, me, renderedAt } = usePractice()
  const byChart = patients.toSorted((a, b) => a.chart.localeCompare(b.chart))
  const today = new Date(renderedAt)
  const [step, setStep] = useState(1)
  const [patient, setPatient] = useState<PatientOption | null>(
    byChart[0] ?? null
  )
  const [issued, setIssued] = useState(() => addDays(today, -1))
  const [due, setDue] = useState(() => addDays(today, 29))
  const [draftNumber, setDraftNumber] = useState("")
  const [number, setNumber] = useState<string | null>(null)
  const [reference, setReference] = useState(byChart[0]?.chart ?? "")
  const [currency, setCurrency] = useState<keyof typeof CURRENCIES>("USD")
  const [terms, setTerms] = useState("Net 30")
  const [collection, setCollection] = useState(COLLECTION[0] ?? "")
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [discount, setDiscount] = useState(0)
  const [missing, setMissing] = useState(false)
  const [sent, setSent] = useState<{ number: string; total: number } | null>(
    null
  )
  const [pending, startTransition] = useTransition()
  const symbol = CURRENCIES[currency]
  const t = wizardTotals(lines, discount)
  const clinician = practitioners.find((p) => p.id === patient?.practitionerId)

  function priceOf(id: string) {
    return procedures.find((p) => p.id === id)?.price ?? 0
  }
  function newLine(): Line {
    return {
      uid: crypto.randomUUID(),
      procedureId: "checkup",
      qty: 1,
      rate: priceOf("checkup"),
      tax: 0,
    }
  }

  useEffect(() => {
    void (async () => {
      const { data: n } = await nextInvoiceNumber(isoDay(issued))
      if (!n) return
      setDraftNumber(n)
      setNumber((current) => current ?? n)
    })()
  }, [issued])

  const setLine = (i: number, patch: Partial<WizardLine>) =>
    setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)))

  function go(next: number) {
    if (next > 1 && !patient) {
      setMissing(true)
      setStep(1)
      return
    }
    setStep(next)
  }

  function send() {
    if (!patient) {
      setMissing(true)
      setStep(1)
      return
    }
    startTransition(async () => {
      const result = outcome(
        await raiseInvoice({
          patientId: patient.id,
          issued: isoDay(issued),
          discount,
          lines,
        })
      )
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      setSent({ number: result.number, total: result.total })
      toast.add({
        type: "success",
        title: "Invoice sent",
        description: `${result.number} for ${money(result.total, symbol)} emailed to ${patient.email}.`,
      })
    })
  }

  const header = (title: string, badge: React.ReactNode, sub: string) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {badge}
      </div>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  )
  const dateButton = (value: Date, onChange: (d: Date) => void, id: string) => (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        {paddedDate(value)}
        <CalendarIcon
          data-icon="inline-end"
          className="text-muted-foreground"
        />
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
  )
  const pick = (
    id: string,
    value: string,
    options: string[],
    onChange: (v: string) => void
  ) => (
    <Select
      items={options.map((o) => ({ value: o, label: o }))}
      value={value}
      onValueChange={(v) => onChange(v as string)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90svh] w-[min(56rem,calc(100vw-4rem))] max-w-none! gap-0 overflow-y-auto p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">New invoice</DialogTitle>
        <DialogDescription className="sr-only">
          Pick a patient, add what was done, then raise the invoice.
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (step < 4) go(step + 1)
            else send()
          }}
        >
          <Card className="gap-0 py-0 ring-0">
            <CardHeader className="gap-x-4 gap-y-1 border-b px-5 py-4 sm:px-6">
              <CardTitle className="text-base leading-5 font-medium">
                New Invoice
              </CardTitle>
              <CardDescription className="max-w-[34rem] text-sm leading-5">
                {STEPS[step - 1]?.description}
              </CardDescription>
              <CardAction className="flex items-center gap-2 self-center pl-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 bg-background",
                    sent ? "text-success-foreground" : "text-warning-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      sent ? "bg-success" : "bg-warning"
                    )}
                  />
                  {sent ? `Sent ${sent.number}` : `Draft ${draftNumber}`}
                </Badge>
                <DialogClose
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Close" />
                  }
                >
                  <XIcon />
                </DialogClose>
              </CardAction>
            </CardHeader>
            <CardContent className="px-5 sm:px-6">
              <fieldset>
                <legend className="sr-only">Invoice builder wizard</legend>
                <Stepper
                  value={step}
                  onValueChange={go}
                  className="flex flex-col gap-6"
                >
                  <StepperNav className="py-4">
                    {STEPS.map((s, i) => (
                      <StepperItem
                        key={s.title}
                        step={i + 1}
                        className="relative min-w-0 flex-1 overflow-visible"
                      >
                        <StepperTrigger
                          aria-label={s.title}
                          className="w-full min-w-0 flex-col items-center justify-start gap-2 rounded-full px-0 text-center"
                        >
                          <StepperIndicator>{i + 1}</StepperIndicator>
                          <StepperTitle className="max-w-20 text-center leading-tight whitespace-normal sm:max-w-full">
                            {s.title}
                          </StepperTitle>
                        </StepperTrigger>
                        {i < STEPS.length - 1 && (
                          <StepperSeparator className="absolute top-3 left-[calc(50%+1.125rem)] m-0 w-[calc(100%-2.25rem)] flex-none group-data-[state=completed]/step:bg-primary" />
                        )}
                      </StepperItem>
                    ))}
                  </StepperNav>
                  <StepperPanel className="pb-6">
                    <StepperContent value={1} className="flex flex-col gap-6">
                      {header(
                        "Patient",
                        <ToneBadge tone="success-light">Required</ToneBadge>,
                        "Who is being billed, and the invoice reference."
                      )}
                      {missing && !patient && (
                        <Alert variant="destructive">
                          <CircleAlertIcon />
                          <AlertTitle>Select a patient</AlertTitle>
                          <AlertDescription>
                            Choose a patient from the directory before adding
                            the treatment carried out to {number}.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FieldGroup className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        <Field
                          data-invalid={missing && !patient ? true : undefined}
                        >
                          <FieldLabel htmlFor="invoice-patient">
                            Patient
                          </FieldLabel>
                          <Combobox
                            items={byChart}
                            value={patient}
                            onValueChange={(p: PatientOption | null) => {
                              setPatient(p)
                              setReference(p?.chart ?? "")
                              if (p) setMissing(false)
                            }}
                            itemToStringLabel={(p: PatientOption) => name(p)}
                            isItemEqualToValue={(
                              a: PatientOption,
                              b: PatientOption
                            ) => a.id === b.id}
                          >
                            <ComboboxInput
                              id="invoice-patient"
                              placeholder="Search the directory by name or chart number..."
                              showClear
                              aria-invalid={
                                missing && !patient ? true : undefined
                              }
                              className="w-full"
                            />
                            <ComboboxContent>
                              <ComboboxEmpty>No patients found.</ComboboxEmpty>
                              <ComboboxList>
                                {(p: PatientOption) => (
                                  <ComboboxItem key={p.id} value={p}>
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate">
                                        {name(p)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {p.chart} ·{" "}
                                        {PATIENT_STAGE[p.stage].label}
                                      </span>
                                    </div>
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-clinician">
                            Clinician
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupAddon>
                              <Building2Icon />
                            </InputGroupAddon>
                            <InputGroupInput
                              id="invoice-clinician"
                              readOnly
                              placeholder="Choose a patient first"
                              value={clinician?.name ?? ""}
                            />
                          </InputGroup>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-number">
                            Invoice Number
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupAddon>
                              <HashIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                              id="invoice-number"
                              value={number ?? ""}
                              onChange={(e) => setNumber(e.target.value)}
                            />
                          </InputGroup>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-reference">
                            Reference
                          </FieldLabel>
                          <Input
                            id="invoice-reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </Field>
                      </FieldGroup>
                      <Separator />
                      {header(
                        "Terms",
                        <ToneBadge tone="info-light">{terms}</ToneBadge>,
                        "Dates, currency, and collection method."
                      )}
                      <FieldGroup className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="invoice-issued">
                            Issue Date
                          </FieldLabel>
                          {dateButton(issued, setIssued, "invoice-issued")}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-due">
                            Due Date
                          </FieldLabel>
                          {dateButton(due, setDue, "invoice-due")}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-currency">
                            Currency
                          </FieldLabel>
                          {pick(
                            "invoice-currency",
                            currency,
                            Object.keys(CURRENCIES),
                            (v) => setCurrency(v as keyof typeof CURRENCIES)
                          )}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-terms">
                            Payment Terms
                          </FieldLabel>
                          {pick("invoice-terms", terms, TERMS, setTerms)}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-collection">
                            Collection
                          </FieldLabel>
                          {pick(
                            "invoice-collection",
                            collection,
                            COLLECTION,
                            setCollection
                          )}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="invoice-phone">Phone</FieldLabel>
                          <Input
                            id="invoice-phone"
                            readOnly
                            placeholder="Choose a patient first"
                            value={patient?.phone ?? ""}
                          />
                        </Field>
                      </FieldGroup>
                    </StepperContent>
                    <StepperContent value={2} className="flex flex-col gap-4">
                      {header(
                        "Line Items",
                        <Badge variant="secondary">
                          {lines.length} {lines.length === 1 ? "item" : "items"}
                        </Badge>,
                        "The procedures carried out, priced from the list."
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="w-14" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l, i) => {
                            const proc = procedures.find(
                              (p) => p.id === l.procedureId
                            )
                            return (
                              <TableRow key={l.uid}>
                                <TableCell className="p-2">
                                  <Select
                                    items={procedures.map((p) => ({
                                      value: p.id,
                                      label: p.name,
                                    }))}
                                    value={l.procedureId}
                                    onValueChange={(v) =>
                                      setLine(i, {
                                        procedureId: v as string,
                                        rate: priceOf(v as string),
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="w-full"
                                      aria-label="Item"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        {procedures.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    aria-label="Quantity"
                                    className="w-17"
                                    defaultValue={l.qty}
                                    onBlur={(e) => {
                                      const qty = clampQty(
                                        Number(e.target.value)
                                      )
                                      e.target.value = String(qty)
                                      setLine(i, { qty })
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="p-2">
                                  <InputGroup>
                                    <InputGroupAddon>$</InputGroupAddon>
                                    <InputGroupInput
                                      type="number"
                                      min={0}
                                      aria-label="Rate"
                                      value={l.rate}
                                      onChange={(e) =>
                                        setLine(i, {
                                          rate: clampRate(
                                            Number(e.target.value)
                                          ),
                                        })
                                      }
                                    />
                                  </InputGroup>
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select
                                    items={TAXES}
                                    value={String(l.tax)}
                                    onValueChange={(v) =>
                                      setLine(i, { tax: Number(v) })
                                    }
                                  >
                                    <SelectTrigger
                                      className="w-full"
                                      aria-label="Tax"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        {TAXES.map((x) => (
                                          <SelectItem
                                            key={x.value}
                                            value={x.value}
                                          >
                                            {x.label}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2 font-medium tabular-nums">
                                  {moneyCents(t.amounts[i] ?? 0, symbol)}
                                </TableCell>
                                <TableCell className="p-2">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove ${proc?.name}`}
                                    disabled={lines.length === 1}
                                    onClick={() =>
                                      setLines(lines.filter((_, n) => n !== i))
                                    }
                                  >
                                    <Trash2Icon />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setLines([...lines, newLine()])}
                        >
                          <PlusIcon data-icon="inline-start" />
                          Add item
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Subtotal {moneyCents(t.subtotal, symbol)}
                        </span>
                      </div>
                    </StepperContent>
                    <StepperContent value={3} className="flex flex-col gap-4">
                      {header(
                        "Tax And Discount",
                        <ToneBadge tone="success-light">
                          {moneyCents(t.total, symbol)}
                        </ToneBadge>,
                        "Set the discount and confirm per-line tax."
                      )}
                      <div className="flex flex-col items-end gap-4 rounded-lg border bg-background p-4">
                        <Field className="w-44">
                          <FieldLabel htmlFor="invoice-discount">
                            Invoice Discount
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupInput
                              id="invoice-discount"
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={discount}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                setDiscount(
                                  Number.isFinite(n)
                                    ? Math.min(100, Math.max(0, n))
                                    : 0
                                )
                              }}
                            />
                            <InputGroupAddon align="inline-end">
                              %
                            </InputGroupAddon>
                          </InputGroup>
                        </Field>
                        <Totals
                          t={t}
                          discount={discount}
                          symbol={symbol}
                          className="w-full rounded-lg border bg-accent/30 p-3"
                        />
                      </div>
                    </StepperContent>
                    <StepperContent value={4} className="flex flex-col gap-4">
                      {sent && (
                        <Alert className="border-success/30 bg-success/4">
                          <CircleCheckIcon className="text-success" />
                          <AlertTitle>Invoice sent</AlertTitle>
                          <AlertDescription>
                            {sent.number} for {moneyCents(sent.total, symbol)}{" "}
                            was emailed to {patient?.email}.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Card className="gap-4 pt-4 pb-0">
                        <CardHeader className="flex flex-row items-start justify-between gap-4 px-4">
                          <div className="flex flex-col gap-1.5">
                            {sent ? (
                              <Badge
                                radius="full"
                                className="w-fit gap-1 bg-success text-white"
                              >
                                <CircleCheckIcon />
                                Sent
                              </Badge>
                            ) : (
                              <ToneBadge
                                tone="info-light"
                                radius="full"
                                className="w-fit gap-1"
                              >
                                <ReceiptIcon />
                                Draft
                              </ToneBadge>
                            )}
                            <span className="text-xl font-medium">
                              Invoice {sent?.number ?? number}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Billed to{" "}
                              <span className="font-medium text-foreground">
                                {patient ? name(patient) : "—"}
                              </span>
                              {patient && ` · ${patient.email}`}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                              Total due
                            </span>
                            <span className="text-2xl font-bold tabular-nums">
                              {moneyCents(t.total, symbol)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Due {paddedDate(due)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                          {lines.map((l, i) => (
                            <article
                              key={l.uid}
                              className="flex items-start justify-between gap-3"
                            >
                              <div className="flex flex-col">
                                <h3 className="text-sm font-semibold">
                                  {
                                    procedures.find(
                                      (p) => p.id === l.procedureId
                                    )?.name
                                  }
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                  {l.qty} × {moneyCents(l.rate, symbol)}
                                  {l.tax ? ` · ${l.tax}% tax` : ""}
                                </span>
                              </div>
                              <span className="text-sm font-semibold tabular-nums">
                                {moneyCents(t.amounts[i] ?? 0, symbol)}
                              </span>
                            </article>
                          ))}
                        </CardContent>
                        <CardFooter className="justify-end border-t bg-muted/50 p-5">
                          <Totals
                            t={t}
                            discount={discount}
                            symbol={symbol}
                            review
                            className="w-72"
                          />
                        </CardFooter>
                      </Card>
                      <Card className="py-4">
                        <CardContent className="grid gap-8 px-4 sm:grid-cols-3">
                          <Detail label="Bill to">
                            <span className="text-sm font-medium">
                              {patient ? name(patient) : "—"}
                            </span>
                            {patient && (
                              <>
                                <span>
                                  {patient.chart} ·{" "}
                                  {PATIENT_STAGE[patient.stage].label}
                                </span>
                                <span>{clinician?.name}</span>
                                <span>{patient.phone}</span>
                              </>
                            )}
                          </Detail>
                          <Detail label="Terms">
                            <span className="text-sm font-medium">{terms}</span>
                            <span>Issued {paddedDate(issued)}</span>
                            <span>Due {paddedDate(due)}</span>
                          </Detail>
                          <Detail label="Collection">
                            <span className="text-sm font-medium">
                              {collection}
                            </span>
                            <span>
                              Ref {reference || "—"} · {currency}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Portrait
                                src={undefined}
                                name={me.name}
                                size={16}
                              />
                              Prepared by {me.name}
                            </span>
                          </Detail>
                        </CardContent>
                      </Card>
                    </StepperContent>
                  </StepperPanel>
                </Stepper>
              </fieldset>
            </CardContent>
            <CardFooter className="gap-3 rounded-b-xl border-t bg-muted/50 px-6 py-4">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Previous
                </Button>
              ) : (
                <span />
              )}
              <div className="ms-auto flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={Boolean(sent)}
                  onClick={() =>
                    toast.add({
                      type: "success",
                      title: "Draft saved",
                      description: `${number} stored with ${lines.length} line ${lines.length === 1 ? "item" : "items"} at ${moneyCents(t.total, symbol)}.`,
                    })
                  }
                >
                  Save draft
                </Button>
                {step < 4 ? (
                  <Button type="submit">
                    Next step
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={pending || Boolean(sent)}>
                    <SendIcon data-icon="inline-start" />
                    {sent ? "Invoice sent" : "Send invoice"}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Totals({
  t,
  discount,
  symbol,
  review,
  className,
}: {
  t: ReturnType<typeof wizardTotals>
  discount: number
  symbol: string
  review?: boolean
  className?: string
}) {
  const row = (
    label: React.ReactNode,
    value: React.ReactNode,
    strong?: boolean
  ) => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd className={cn("tabular-nums", strong && "text-base font-semibold")}>
        {value}
      </dd>
    </div>
  )
  return (
    <dl className={cn("flex flex-col gap-2.5", className)}>
      {row("Subtotal", moneyCents(t.subtotal, symbol))}
      {(!review || discount > 0) &&
        row(
          `Discount (${discount}%)`,
          <span className={review ? "text-success" : undefined}>
            -{moneyCents(t.discount, symbol)}
          </span>
        )}
      {row("Tax", moneyCents(t.tax, symbol))}
      {review && <Separator />}
      {row("Total Due", moneyCents(t.total, symbol), true)}
    </dl>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span className="text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}
