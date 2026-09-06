import { ReceiptTextIcon } from "lucide-react"

import { ToneBadge } from "@/components/shared/tone-badge"
import { Card, CardHeader } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import type { LedgerInvoice } from "@/db/queries/payments"
import { ledgerSummary, money } from "@/lib/invoices"

const count = (n: number) => `${n} ${n === 1 ? "invoice" : "invoices"}`

/** Treatment billed: what's owed, whether anything is late, and how it splits */
export function SummaryCard({
  invoices,
  today,
}: {
  invoices: LedgerInvoice[]
  today: Date
}) {
  const s = ledgerSummary(invoices, today)
  const cell = (label: string, value: number, n: number) => (
    <div>
      <div className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{money(value)}</div>
      <div className="text-xs text-muted-foreground">{count(n)}</div>
    </div>
  )
  return (
    <Card className="gap-0 p-0">
      <CardHeader className="px-4 py-3">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <div className="flex min-w-0 gap-3">
            <IconTile
              variant="elevated"
              className="bg-accent text-foreground [--icon-tile-icon-size:--spacing(4.5)] [--icon-tile-size:--spacing(10)]"
            >
              <ReceiptTextIcon />
            </IconTile>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Treatment billed</span>
                {s.overdueCount ? (
                  <ToneBadge tone="warning-light">Action needed</ToneBadge>
                ) : (
                  <ToneBadge tone="success-light">Up to date</ToneBadge>
                )}
              </div>
              <div>
                <div className="text-xs tracking-wide text-muted-foreground uppercase">
                  Outstanding balance
                </div>
                <div className="text-3xl font-semibold tabular-nums">
                  {money(s.outstanding)}
                </div>
              </div>
              <p className="text-sm text-pretty text-muted-foreground">
                {s.raised} invoices raised against completed treatment,{" "}
                {s.overdueCount
                  ? `oldest past due ${s.oldestOverdue} days.`
                  : "none past due."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:border-s lg:ps-6">
            {cell("Current", s.current, s.currentCount)}
            {cell("Overdue", s.overdue, s.overdueCount)}
            {cell("Collected", s.collected, s.collectedCount)}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
