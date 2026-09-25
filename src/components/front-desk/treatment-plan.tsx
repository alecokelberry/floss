"use client"

import { CalendarPlusIcon } from "lucide-react"
import { useTransition } from "react"

import { decidePlan } from "@/app/actions/front-desk"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import type { PlanItem, PlanStatus } from "@/db/schema"
import { openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { monthDay, parseDay } from "@/lib/dates"
import { moneyCents } from "@/lib/invoices"
import { planLines, planTotals, toothLabel } from "@/lib/treatment"

import { PlanStatusBadge } from "./badges"

export type PlanCardPlan = {
  id: number
  status: PlanStatus
  items: PlanItem[]
  presentedOn: string
  decidedOn: string | null
  practitioner: { id: string; name: string }
}

/**
 * A treatment plan as the desk presents it: each line's code, tooth and fee, what the carrier is expected to pay and
 * the patient's share; a proposed plan takes the patient's answer, an accepted one books its first visit.
 */
export function TreatmentPlanCard({
  plan,
  patientId,
  carrier,
  onDone,
}: {
  plan: PlanCardPlan
  patientId: number
  carrier: string | null
  /** After the patient's answer lands, for the sheet to read the plan again */
  onDone?: () => void
}) {
  const { procedures } = usePractice()
  const [pending, startTransition] = useTransition()
  // Two lines can be the same procedure on no one tooth (a quadrant each), so a line's place is part of its key
  const lines = planLines(plan.items, procedures, carrier).map((l, n) => ({
    ...l,
    key: `${n}-${l.procedureId}`,
  }))
  const totals = planTotals(lines)
  const on = (iso: string) => {
    const d = parseDay(iso)
    return d ? monthDay(d) : iso
  }
  function decide(status: "accepted" | "declined") {
    startTransition(async () => {
      const result = outcome(await decidePlan({ id: plan.id, status }))
      if (result.ok) onDone?.()
      toast.add(
        result.ok
          ? {
              type: "success",
              title: status === "accepted" ? "Plan accepted" : "Plan declined",
              description: result.message,
            }
          : { type: "error", title: result.error }
      )
    })
  }
  const first = plan.items[0]
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">
            Presented {on(plan.presentedOn)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {plan.practitioner.name}
            {plan.decidedOn &&
              ` · ${plan.status === "accepted" ? "accepted" : "declined"} ${on(plan.decidedOn)}`}
          </span>
        </div>
        <PlanStatusBadge status={plan.status} />
      </div>
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-7 ps-0">Procedure</TableHead>
            <TableHead className="h-7">Tooth</TableHead>
            <TableHead className="h-7 pe-0 text-end">Fee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => (
            <TableRow key={l.key} className="hover:bg-transparent">
              <TableCell className="py-1.5 ps-0">
                <span className="me-1.5 font-mono text-[11px] text-muted-foreground">
                  {l.code}
                </span>
                {l.name}
              </TableCell>
              <TableCell className="py-1.5 tabular-nums">
                {toothLabel(l.tooth)}
              </TableCell>
              <TableCell className="py-1.5 pe-0 text-end tabular-nums">
                {moneyCents(l.fee)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <dl className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Insurance estimate</dt>
          <dd className="tabular-nums">
            {carrier ? moneyCents(totals.insurance) : "Self-pay"}
          </dd>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <dt>Patient portion</dt>
          <dd className="tabular-nums">{moneyCents(totals.patient)}</dd>
        </div>
      </dl>
      {plan.status === "proposed" && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => decide("declined")}
          >
            Declined
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => decide("accepted")}
          >
            Accepted
          </Button>
        </div>
      )}
      {plan.status === "accepted" && first && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openSheet({
                kind: "new-booking",
                defaults: {
                  patientId,
                  procedureId: first.procedureId,
                  practitionerId: plan.practitioner.id,
                },
              })
            }
          >
            <CalendarPlusIcon data-icon="inline-start" />
            Book first visit
          </Button>
        </div>
      )}
    </div>
  )
}
