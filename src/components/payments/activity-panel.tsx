"use client"

import { PlusIcon } from "lucide-react"

import { ContextPanel } from "@/components/shared/context-panel"
import { usePractice } from "@/components/shell/practice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from "@/components/ui/timeline"
import type { LedgerInvoice } from "@/db/queries/payments"
import { openSheet } from "@/hooks/use-sheet"
import { monthDay } from "@/lib/dates"
import { INVOICE_STATUS, ledgerSummary, money } from "@/lib/invoices"
import { INVOICE_DOT } from "@/lib/tones"
import { cn } from "@/lib/utils"

const SHOWN = 40

/** The Activity: the newest 40 invoices on a Timeline, each opening its sheet; what's settled and owed */
export function ActivityPanel({ invoices }: { invoices: LedgerInvoice[] }) {
  const { renderedAt } = usePractice()
  const s = ledgerSummary(invoices, new Date(renderedAt))
  return (
    <ContextPanel
      title="Activity"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New invoice"
          onClick={() => openSheet({ kind: "new-invoice" })}
        >
          <PlusIcon />
        </Button>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          <Timeline className="max-w-sm" orientation="vertical">
            {invoices.slice(0, SHOWN).map((i, n) => {
              const line = i.lines[0]
              const open = () => openSheet({ kind: "invoice", key: i.key })
              return (
                <TimelineItem key={i.key} step={n + 1}>
                  <TimelineHeader>
                    <TimelineSeparator className="h-[calc(100%-20px)] translate-y-4 bg-border" />
                    <TimelineDate className="mb-0 text-[11px] font-semibold text-muted-foreground uppercase">
                      {monthDay(i.issued)}
                    </TimelineDate>
                    <TimelineIndicator
                      className={cn(
                        "top-1 size-2 border-0",
                        INVOICE_DOT[i.status]
                      )}
                    />
                  </TimelineHeader>
                  <TimelineContent>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          open()
                        }
                      }}
                      className="flex flex-col gap-1 rounded-sm pt-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-sm leading-snug font-medium text-foreground">
                        {i.number}
                      </span>
                      <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                        {line.patient.firstName} {line.patient.lastName} ·{" "}
                        {money(i.amount)}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="truncate text-sm text-muted-foreground">
                          {line.practitioner.name}
                        </span>
                        <span className="sr-only">
                          {INVOICE_STATUS[i.status]}
                        </span>
                        <Badge variant="outline">
                          <span
                            aria-hidden
                            className={cn(
                              "size-1.5 rounded-full",
                              INVOICE_DOT[i.status]
                            )}
                          />
                          {line.patient.chart}
                        </Badge>
                      </span>
                    </div>
                  </TimelineContent>
                </TimelineItem>
              )
            })}
          </Timeline>
        </div>
      </ScrollArea>
      <div className="flex h-10 shrink-0 items-center justify-between border-t px-3 text-xs">
        <span className="text-muted-foreground">
          {s.collectedCount} settled ·{" "}
          <span className="text-foreground tabular-nums">
            {money(s.collected)}
          </span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {money(s.outstanding)} owed
        </span>
      </div>
    </ContextPanel>
  )
}
