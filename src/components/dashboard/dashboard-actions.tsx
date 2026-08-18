"use client"

import { DownloadIcon, Share2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { DayBoard } from "@/db/queries/day"
import { clock, isoDay } from "@/lib/dates"

/** The day sheet as CSV: one line per booking, in the sheet's order */
function sheetCsv(board: DayBoard) {
  const name = (id: string, list: { id: string; name: string }[]) =>
    list.find((x) => x.id === id)?.name ?? ""
  const cell = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const lines = board.bookings.map((b) =>
    [
      clock(b.startsAt),
      clock(b.endsAt),
      b.patient,
      name(b.procedureId, board.procedures),
      name(b.practitionerId, board.chairs),
      b.roomId ? name(b.roomId, board.rooms) : "",
      b.status,
    ]
      .map(cell)
      .join(",")
  )
  return [
    "Start,End,Patient,Procedure,Practitioner,Room,Status",
    ...lines,
  ].join("\n")
}

/** The header actions: Export writes the day sheet and says so; Share explains itself (nothing to link to yet) */
export function DashboardActions({ board }: { board: DayBoard }) {
  function exportSheet() {
    const file = `clinic-${isoDay(board.day)}.csv`
    const url = URL.createObjectURL(
      new Blob([sheetCsv(board)], { type: "text/csv" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = file
    a.click()
    URL.revokeObjectURL(url)
    toast.add({
      type: "success",
      title: "Day sheet exported",
      description: `${board.bookings.length} bookings written to ${file}.`,
    })
  }
  return (
    <>
      <Button
        variant="outline"
        aria-label="Export the day sheet"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={exportSheet}
      >
        <DownloadIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Export</span>
      </Button>
      <Button
        aria-label="Share the dashboard"
        className="has-data-[icon=inline-start]:pl-2.5"
        onClick={() =>
          toast.add({
            type: "info",
            title: "Share this dashboard",
            description:
              "Sends a read-only link to the day you are looking at. Connect your sharing service to issue one.",
          })
        }
      >
        <Share2Icon data-icon="inline-start" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </>
  )
}
