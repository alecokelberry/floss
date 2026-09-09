"use client"

import { CircleUserIcon, UploadIcon, XIcon } from "lucide-react"
import { Fragment, useRef, useState, useTransition } from "react"

import { setChairColor } from "@/app/actions/bookings"
import {
  resetPrices,
  savePrices,
  saveProfile,
  saveSetting,
  setChairShown,
} from "@/app/actions/settings"
import { Portrait } from "@/components/shared/avatars"
import { ToneBadge } from "@/components/shared/tone-badge"
import { usePractice } from "@/components/shell/practice"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { CHAIR_COLORS, type ChairColor, type EventKind } from "@/db/schema"
import { type ActionResult, outcome } from "@/lib/action-result"
import { DEMO_STAFF } from "@/lib/demo-account"
import { money } from "@/lib/invoices"
import {
  closingHours,
  hourLabel,
  openingHours,
  PAYMENT_TERMS,
  ROLES,
  type Settings,
  type SettingsTab,
  TIME_ZONES,
  withOpening,
} from "@/lib/settings"
import { CHAIR_COLOR, EVENT_KIND } from "@/lib/tones"
import { cn } from "@/lib/utils"

const ALERT_COPY: Record<EventKind, string> = {
  booked: "A chair was given to a patient.",
  rescheduled: "A booking moved to another time or chair.",
  status: "Somebody arrived, took the chair, or settled up.",
  updated: "A booking's details were corrected.",
  cancelled: "A slot was given back.",
}

/** A saved-on-change setting: the server action, and a toast only when it's refused */
function useSave() {
  const [, startTransition] = useTransition()
  return (run: () => Promise<Parameters<typeof outcome<ActionResult>>[0]>) =>
    startTransition(async () => {
      const result = outcome(await run())
      if (!result.ok) toast.add({ type: "error", title: result.error })
    })
}

/** The card every tab shares: a title and description over a fieldset of rows, and a footer on the two that save */
function SettingsFrame({
  title,
  description,
  legend,
  children,
  footer,
}: {
  title: string
  description: React.ReactNode
  legend: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-0 border-b px-5 pt-3 pb-4">
        <CardTitle className="text-base leading-snug font-medium">
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <FieldSet className="gap-0">
        <FieldLegend className="sr-only">{title}</FieldLegend>
        <p className="sr-only">{legend}</p>
        <FieldGroup className="gap-0">{children}</FieldGroup>
      </FieldSet>
      {footer && (
        <CardFooter className="justify-end gap-2 rounded-b-xl border-t bg-secondary/50 px-5 py-3">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

/** A row: its label and description at the left, its control at the right */
function Row({
  label,
  description,
  htmlFor,
  children,
  wide,
  after,
}: {
  label: React.ReactNode
  description: string
  htmlFor?: string
  children: React.ReactNode
  /** A full-width control (text inputs), left-aligned in its column */
  wide?: boolean
  after?: React.ReactNode
}) {
  return (
    <Field orientation="horizontal" className="gap-4 px-5 py-3">
      <FieldContent className="max-w-sm flex-1 gap-0.5">
        <FieldLabel htmlFor={htmlFor} className="leading-none">
          {label}
        </FieldLabel>
        <FieldDescription className="leading-normal text-balance">
          {description}
        </FieldDescription>
      </FieldContent>
      <div
        className={cn(
          "flex flex-1 flex-col gap-1",
          wide ? "items-stretch" : "items-end"
        )}
      >
        {children}
        {after}
      </div>
    </Field>
  )
}

/** Rows with separators between them */
function Rows({ children }: { children: React.ReactNode[] }) {
  return children.map((child, i) => (
    // oxlint-disable-next-line react/no-array-index-key -- a fixed list of rows
    <Fragment key={i}>
      {i > 0 && <FieldSeparator className="-my-2 h-5" />}
      {child}
    </Fragment>
  ))
}

export function SettingsCard({
  tab,
  ledger,
}: {
  tab: SettingsTab
  ledger: { outstanding: number; open: number; pastDue: number }
}) {
  if (tab === "hours") return <HoursCard />
  if (tab === "chairs") return <ChairsCard />
  if (tab === "procedures") return <ProceduresCard />
  if (tab === "billing") return <BillingCard ledger={ledger} />
  if (tab === "notifications") return <AlertsCard />
  return <ProfileCard />
}

function ProfileCard() {
  const { me, settings } = usePractice()
  const initial = { name: me.name, profile: settings.profile }
  const [d, setD] = useState(initial)
  const [photo, setPhoto] = useState<string | undefined>(
    DEMO_STAFF.find((s) => s.email === me.email)?.photo
  )
  const [pending, startTransition] = useTransition()
  const file = useRef<HTMLInputElement>(null)
  const setProfile = (patch: Partial<Settings["profile"]>) =>
    setD({ ...d, profile: { ...d.profile, ...patch } })

  function save() {
    startTransition(async () => {
      const result = outcome(await saveProfile(d))
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      toast.add({ type: "success", title: result.message })
    })
  }

  const pick = (
    id: string,
    value: string,
    options: readonly string[],
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
    <SettingsFrame
      title="My profile"
      description="Public account details"
      legend="Your name, how the practice reaches you, and what others see."
      footer={
        <>
          <Button variant="outline" onClick={() => setD(initial)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <Rows>
        <Row label="Photo" description="Shown in comments and mentions." wide>
          <div className="flex items-center gap-3">
            {photo ? (
              <Portrait src={photo} name={d.name} size={40} />
            ) : (
              <Avatar className="size-10">
                <AvatarFallback>
                  <CircleUserIcon className="size-4 opacity-60" />
                </AvatarFallback>
              </Avatar>
            )}
            <input
              ref={file}
              type="file"
              accept="image/*"
              aria-label="Upload profile image"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhoto(URL.createObjectURL(f))
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => file.current?.click()}
            >
              <UploadIcon data-icon="inline-start" />
              {photo ? "Change" : "Upload"}
            </Button>
            {photo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhoto(undefined)}
              >
                <XIcon data-icon="inline-start" />
                Remove
              </Button>
            )}
          </div>
        </Row>
        <Row
          label="Full name"
          description="Used across the workspace."
          htmlFor="profile-name"
          wide
        >
          <Input
            id="profile-name"
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
          />
        </Row>
        <Row
          label={
            <span className="flex items-center gap-2">
              Email address
              <ToneBadge tone="success-light">Verified</ToneBadge>
            </span>
          }
          description="Primary sign-in email."
          htmlFor="profile-email"
          wide
        >
          <Input id="profile-email" type="email" value={me.email} readOnly />
        </Row>
        <Row
          label="Username"
          description="Visible in mentions and links."
          htmlFor="profile-username"
          wide
        >
          <InputGroup>
            <InputGroupAddon>@</InputGroupAddon>
            <InputGroupInput
              id="profile-username"
              value={d.profile.username}
              onChange={(e) => setProfile({ username: e.target.value })}
            />
          </InputGroup>
        </Row>
        <Row
          label="Profile details"
          description="Public details shared across the workspace."
          wide
        >
          <FieldGroup className="gap-4">
            <Field className="gap-2">
              <FieldLabel htmlFor="profile-role" className="leading-none">
                Role
              </FieldLabel>
              {pick("profile-role", d.profile.role, ROLES, (role) =>
                setProfile({ role: role as Settings["profile"]["role"] })
              )}
            </Field>
            <Field className="gap-2">
              <FieldLabel htmlFor="profile-tz" className="leading-none">
                Time zone
              </FieldLabel>
              {pick("profile-tz", d.profile.timeZone, TIME_ZONES, (timeZone) =>
                setProfile({ timeZone })
              )}
            </Field>
            <Field className="gap-2">
              <FieldLabel htmlFor="profile-website" className="leading-none">
                Website
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>https://</InputGroupAddon>
                <InputGroupInput
                  id="profile-website"
                  value={d.profile.website}
                  onChange={(e) => setProfile({ website: e.target.value })}
                />
              </InputGroup>
            </Field>
          </FieldGroup>
        </Row>
        <Row
          label="Bio"
          description="Short profile summary."
          htmlFor="profile-bio"
          wide
        >
          <Textarea
            id="profile-bio"
            rows={4}
            className="min-h-24"
            placeholder="A line about you, for the practice's own records."
            value={d.profile.bio}
            onChange={(e) => setProfile({ bio: e.target.value })}
          />
        </Row>
      </Rows>
    </SettingsFrame>
  )
}

function HoursCard() {
  const { settings } = usePractice()
  const [hours, setHours] = useState(settings.hours)
  const save = useSave()
  const set = (next: Settings["hours"]) => {
    setHours(next)
    save(() => saveSetting({ key: "hours", value: next }))
  }
  const hourSelect = (
    id: string,
    value: number,
    options: number[],
    onChange: (h: number) => void
  ) => (
    <Select
      items={options.map((h) => ({ value: String(h), label: hourLabel(h) }))}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger id={id} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {hourLabel(h)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
  return (
    <SettingsFrame
      title="Opening hours"
      description="The window both calendars draw, and the day capacity is measured against."
      legend="When the practice opens and when the last chair ends."
    >
      <Rows>
        <Row
          label="Opens"
          description="The first hour on the board, and where it scrolls to."
          htmlFor="hours-open"
        >
          {hourSelect("hours-open", hours.open, openingHours, (open) =>
            set(withOpening(hours, open))
          )}
        </Row>
        <Row
          label="Closes"
          description="The last hour drawn. Only hours after opening are offered, so the day cannot invert."
          htmlFor="hours-close"
        >
          {hourSelect(
            "hours-close",
            hours.close,
            closingHours(hours.open),
            (close) => set({ ...hours, close })
          )}
        </Row>
      </Rows>
    </SettingsFrame>
  )
}

function ChairsCard() {
  const { practitioners } = usePractice()
  const [shown, setShown] = useState(
    Object.fromEntries(practitioners.map((p) => [p.id, p.onBoard]))
  )
  const [colors, setColors] = useState(
    Object.fromEntries(practitioners.map((p) => [p.id, p.color]))
  )
  const save = useSave()
  const on = Object.values(shown).filter(Boolean).length
  return (
    <SettingsFrame
      title="Chairs"
      description={`${on} of ${practitioners.length} on the board.`}
      legend="Which chairs the board draws, and the colour each one wears."
    >
      <Rows>
        {practitioners.map((p) => (
          <Row key={p.id} label={p.name} description={p.specialty}>
            <div className="flex items-center gap-3">
              <Select
                items={CHAIR_COLORS.map((c) => ({
                  value: c,
                  label: c,
                }))}
                value={colors[p.id]}
                onValueChange={(v) => {
                  const color = v as ChairColor
                  setColors({ ...colors, [p.id]: color })
                  save(() => setChairColor({ id: p.id, color }))
                }}
              >
                <SelectTrigger
                  aria-label={`${p.name}'s color`}
                  className="w-36"
                >
                  <SelectValue>
                    {(c: ChairColor) => (
                      <span className="flex items-center gap-2 capitalize">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: CHAIR_COLOR[c] }}
                        />
                        {c}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CHAIR_COLORS.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: CHAIR_COLOR[c] }}
                        />
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Switch
                aria-label={`Show ${p.name} on the board`}
                checked={shown[p.id]}
                disabled={shown[p.id] && on === 1}
                onCheckedChange={(v) => {
                  setShown({ ...shown, [p.id]: v })
                  save(() => setChairShown({ id: p.id, on: v }))
                }}
              />
            </div>
          </Row>
        ))}
      </Rows>
    </SettingsFrame>
  )
}

function ProceduresCard() {
  const { procedures } = usePractice()
  const fromServer = () =>
    Object.fromEntries(procedures.map((p) => [p.id, String(p.price)]))
  const [typed, setTyped] = useState(fromServer)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = outcome(
        await savePrices(
          Object.fromEntries(
            Object.entries(typed).map(([k, v]) => [k, v.trim()])
          )
        )
      )
      if (!result.ok) {
        setErrors("errors" in result ? result.errors : {})
        return
      }
      setErrors({})
      setTyped(
        Object.fromEntries(Object.entries(typed).map(([k, v]) => [k, v.trim()]))
      )
      toast.add({
        type: "success",
        title: result.message,
        description: result.message.startsWith("No")
          ? undefined
          : "Every invoice for those treatments is repriced.",
      })
    })
  }

  function reset() {
    startTransition(async () => {
      const result = outcome(await resetPrices())
      if (!result.ok) return
      setErrors({})
      setTyped(
        Object.fromEntries(procedures.map((p) => [p.id, String(p.listPrice)]))
      )
      toast.add({ type: "success", title: result.message })
    })
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <SettingsFrame
        title="Procedures"
        description="What each treatment costs. The ledger bills from this list."
        legend="The price of each treatment, and how long its chair runs."
        footer={
          <>
            <Button variant="outline" disabled={pending} onClick={reset}>
              Reset to list price
            </Button>
            <Button type="submit" disabled={pending}>
              Save prices
            </Button>
          </>
        }
      >
        <Rows>
          {procedures.map((p) => (
            <Row
              key={p.id}
              label={p.name}
              description={`${p.code} · ${p.minutes} minutes in the chair`}
              htmlFor={`price-${p.id}`}
              after={
                errors[p.id] && (
                  <FieldError className="text-xs">{errors[p.id]}</FieldError>
                )
              }
            >
              <InputGroup className="w-36">
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  id={`price-${p.id}`}
                  inputMode="decimal"
                  aria-invalid={errors[p.id] ? true : undefined}
                  value={typed[p.id] ?? ""}
                  onChange={(e) =>
                    setTyped({ ...typed, [p.id]: e.target.value })
                  }
                />
              </InputGroup>
            </Row>
          ))}
        </Rows>
      </SettingsFrame>
    </form>
  )
}

function BillingCard({
  ledger,
}: {
  ledger: { outstanding: number; open: number; pastDue: number }
}) {
  const { settings } = usePractice()
  const [terms, setTerms] = useState(settings.terms)
  const save = useSave()
  return (
    <SettingsFrame
      title="Billing"
      description="The terms every invoice is raised on and aged against."
      legend="How long a patient has to settle an invoice."
    >
      <Rows>
        <Row
          label="Payment terms"
          description="Counted from the day the chair ran. Changing it re-ages every invoice in the ledger."
          htmlFor="billing-terms"
        >
          <Select
            items={PAYMENT_TERMS.map((n) => ({
              value: String(n),
              label: `Net ${n}`,
            }))}
            value={String(terms)}
            onValueChange={(v) => {
              const next = Number(v) as Settings["terms"]
              setTerms(next)
              save(() => saveSetting({ key: "terms", value: next }))
            }}
          >
            <SelectTrigger id="billing-terms" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PAYMENT_TERMS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Net {n}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Row>
        <Row
          label="Outstanding today"
          description="What these terms leave unpaid across the whole ledger."
        >
          <span className="text-sm font-medium">
            {money(ledger.outstanding)} over {ledger.open}{" "}
            {ledger.open === 1 ? "invoice" : "invoices"}
          </span>
        </Row>
        <Row
          label="Past due today"
          description="Invoices these terms have already made late."
        >
          <span className="text-sm font-medium">
            {ledger.pastDue ? `${ledger.pastDue} past due` : "None"}
          </span>
        </Row>
      </Rows>
    </SettingsFrame>
  )
}

function AlertsCard() {
  const { settings } = usePractice()
  const [alerts, setAlerts] = useState(settings.alerts)
  const save = useSave()
  return (
    <SettingsFrame
      title="Activity alerts"
      description="The board logs every one of these. Choose which reach the bell."
      legend="Which of the board's own log lines reach the bell."
    >
      <Rows>
        {(Object.keys(ALERT_COPY) as EventKind[]).map((k) => (
          <Row
            key={k}
            label={EVENT_KIND[k].label}
            description={ALERT_COPY[k]}
            htmlFor={`alert-${k}`}
          >
            <Switch
              id={`alert-${k}`}
              checked={alerts[k]}
              onCheckedChange={(v) => {
                const next = { ...alerts, [k]: v }
                setAlerts(next)
                save(() => saveSetting({ key: "alerts", value: next }))
              }}
            />
          </Row>
        ))}
      </Rows>
    </SettingsFrame>
  )
}
