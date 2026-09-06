"use client"

import {
  type ColumnDef,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import {
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  FunnelIcon,
  FunnelXIcon,
  PencilIcon,
  ReceiptTextIcon,
  SendIcon,
  StethoscopeIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react"
import { useState } from "react"

import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import {
  type GridLayout,
  GridSettings,
} from "@/components/shared/grid-settings"
import { ToneBadge } from "@/components/shared/tone-badge"
import { DeleteInvoiceDialog, remind } from "@/components/sheets/invoice-sheet"
import { usePractice } from "@/components/shell/practice"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DataGrid,
  type DataGridFeatures,
  dataGridFeatures,
} from "@/components/ui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/ui/data-grid/data-grid-scroll-area"
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid/data-grid-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  createFilterQuery,
  createFilterRule,
  type FilterField,
  type FilterQuery,
  Filters,
  flattenFilterRules,
} from "@/components/ui/filters/filters"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import type { LedgerInvoice } from "@/db/queries/payments"
import { openSheet } from "@/hooks/use-sheet"
import { monthDay } from "@/lib/dates"
import { matchRule, matchValues, ruleReady } from "@/lib/filters"
import { dueCell, INVOICE_STATUS, money } from "@/lib/invoices"
import { INVOICE_TONE } from "@/lib/tones"
import { cn } from "@/lib/utils"

const HIDEABLE = [
  ["invoice", "Invoice"],
  ["treatment", "Treatment"],
  ["clinician", "Clinician"],
  ["amount", "Amount"],
  ["due", "Due"],
  ["status", "Status"],
] as const

const emptyQuery = () =>
  createFilterQuery([
    createFilterRule({
      id: "patient-0",
      path: ["patient"],
      operator: "contains",
    }),
  ])

const patientName = (i: LedgerInvoice) =>
  `${i.lines[0].patient.firstName} ${i.lines[0].patient.lastName}`

/** What a Filters field reads off an invoice: its patient's name, or its treatments, clinician or status */
function values(i: LedgerInvoice, field: string): string[] {
  if (field === "treatment") return i.lines.map((l) => l.procedure.id)
  if (field === "clinician") return [i.lines[0].practitioner.id]
  if (field === "status") return [i.status]
  return [patientName(i)]
}

/**
 * The Invoice Ledger: the invoices through Filters (Patient, Treatment, Clinician, Status) on a
 * DataGrid, newest first, a menu per row; Export sums what's shown.
 */
export function Ledger({ invoices }: { invoices: LedgerInvoice[] }) {
  const { practitioners, procedures, renderedAt } = usePractice()
  const today = new Date(renderedAt)
  const [query, setQuery] = useState<FilterQuery>(emptyQuery)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "invoice", desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>({
    treatment: false,
  })
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [layout, setLayout] = useState<GridLayout>({
    dense: true,
    resizable: true,
    movable: true,
  })
  const [deleting, setDeleting] = useState<LedgerInvoice | null>(null)

  const rules = flattenFilterRules(query).filter((r) =>
    ruleReady(r.operator, r.value)
  )
  const shown = invoices.filter((i) =>
    rules.every((r) =>
      r.path[0] === "patient"
        ? matchRule(patientName(i), r.operator, r.value, r.negated)
        : matchValues(
            values(i, r.path[0] ?? ""),
            r.operator,
            r.value,
            r.negated
          )
    )
  )
  const outstanding = shown.filter((i) => i.status !== "paid").length
  const pastDue = shown.filter((i) => i.status === "past_due").length

  const fields: FilterField[] = [
    {
      id: "patient",
      label: "Patient",
      icon: <UserRoundIcon />,
      type: "text",
      placeholder: "enter text...",
      defaultOperator: "contains",
    },
    {
      id: "treatment",
      label: "Treatment",
      icon: <ReceiptTextIcon />,
      type: "multiselect",
      options: procedures.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      id: "clinician",
      label: "Clinician",
      icon: <StethoscopeIcon />,
      type: "multiselect",
      options: practitioners.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      id: "status",
      label: "Status",
      icon: <FunnelXIcon />,
      type: "multiselect",
      options: (["paid", "open", "past_due"] as const).map((s) => ({
        value: s,
        label: INVOICE_STATUS[s],
      })),
    },
  ]

  const columns: ColumnDef<DataGridFeatures, LedgerInvoice>[] = [
    {
      id: "select",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }) => <DataGridTableRowSelect row={row} />,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
      meta: { headerClassName: "ps-4", cellClassName: "ps-4" },
    },
    {
      id: "patient",
      accessorFn: patientName,
      header: ({ column }) => (
        <DataGridColumnHeader title="Patient" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <div className="flex min-w-0 items-center gap-3">
          <PatientAvatar patient={i.lines[0].patient} size={32} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{patientName(i)}</span>
            <span className="truncate text-xs text-muted-foreground">
              {i.lines[0].patient.chart}
            </span>
          </div>
        </div>
      ),
      enableHiding: false,
      size: 329,
      meta: { fillWidth: true },
    },
    {
      id: "invoice",
      // Date, then the day's number: the ledger's own order
      accessorFn: (i) => i.issued.getTime() * 100 + i.n,
      header: ({ column }) => (
        <DataGridColumnHeader title="Invoice" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{i.number}</span>
          <span className="text-xs text-muted-foreground">
            {monthDay(i.issued)}
          </span>
        </div>
      ),
      size: 140,
    },
    {
      id: "treatment",
      accessorFn: (i) => i.treatment,
      header: ({ column }) => (
        <DataGridColumnHeader title="Treatment" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{i.treatment}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {i.codes}
          </span>
        </div>
      ),
      size: 160,
    },
    {
      id: "clinician",
      accessorFn: (i) => i.lines[0].practitioner.name,
      header: ({ column }) => (
        <DataGridColumnHeader title="Clinician" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <PractitionerAvatar
            practitioner={i.lines[0].practitioner}
            size={20}
          />
          <span className="truncate">{i.lines[0].practitioner.name}</span>
        </div>
      ),
      size: 160,
    },
    {
      id: "amount",
      accessorFn: (i) => i.amount,
      header: ({ column }) => (
        <DataGridColumnHeader title="Amount" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <span className="font-medium tabular-nums">{money(i.amount)}</span>
      ),
      size: 100,
    },
    {
      id: "due",
      accessorFn: (i) => i.due.getTime(),
      header: ({ column }) => (
        <DataGridColumnHeader title="Due" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => {
        const d = dueCell(i, today)
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                d.tone === "muted"
                  ? "text-muted-foreground"
                  : d.tone === "overdue"
                    ? "font-medium text-destructive"
                    : "font-medium"
              )}
            >
              {d.top}
            </span>
            <span className="text-xs text-muted-foreground">
              {monthDay(i.status === "paid" ? i.issued : i.due)}
            </span>
          </div>
        )
      },
      size: 110,
    },
    {
      id: "status",
      accessorFn: (i) => i.status,
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" column={column} visibility />
      ),
      cell: ({ row: { original: i } }) => (
        <ToneBadge tone={INVOICE_TONE[i.status]}>
          {INVOICE_STATUS[i.status]}
        </ToneBadge>
      ),
      size: 100,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row: { original: i } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Invoice actions for ${patientName(i)}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => openSheet({ kind: "invoice", key: i.key })}
              >
                <EyeIcon />
                View invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openSheet({ kind: "invoice", key: i.key, edit: true })
                }
              >
                <PencilIcon />
                Edit invoice
              </DropdownMenuItem>
              {i.status !== "paid" && (
                <DropdownMenuItem onClick={() => remind(i)}>
                  <SendIcon />
                  Send reminder
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleting(i)}
              >
                <Trash2Icon />
                Delete invoice
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 60,
    },
  ]

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: shown,
    getRowId: (i: LedgerInvoice) => i.key,
    pageCount: Math.ceil(shown.length / pagination.pageSize),
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility: visibility,
      ...(columnOrder.length ? { columnOrder } : {}),
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,
    onColumnOrderChange: setColumnOrder,
    enableColumnResizing: layout.resizable,
    columnResizeMode: "onChange",
  })

  const hasChips = flattenFilterRules(query).length > 0

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-4 py-3 pb-3!">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <CardTitle className="text-base leading-snug font-medium">
            Invoice Ledger
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <span>{outstanding} outstanding</span>
            <span
              aria-hidden
              className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
            />
            <span>{pastDue} past due</span>
          </CardDescription>
        </div>
        <Button
          variant="outline"
          className="has-data-[icon=inline-start]:pl-2.5"
          onClick={() => {
            const total = shown.reduce((t, i) => t + i.amount, 0)
            toast.add({
              type: "success",
              title: "Statement export queued",
              description: `${shown.length} ${shown.length === 1 ? "invoice" : "invoices"}, ${money(total)} in total.`,
            })
          }}
        >
          <DownloadIcon data-icon="inline-start" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <Filters
            fields={fields}
            query={query}
            onQueryChange={(q) => {
              setQuery(q)
              setPagination({ ...pagination, pageIndex: 0 })
            }}
            trigger={
              <Button variant="outline" aria-label="Filter invoices">
                <FunnelIcon data-icon="inline-start" />
                Filters
              </Button>
            }
          />
          <div className="flex shrink-0 items-center gap-2">
            {hasChips && rules.length > 0 && (
              <Button variant="outline" onClick={() => setQuery(emptyQuery())}>
                <FunnelXIcon data-icon="inline-start" className="size-3.5" />
                Clear
              </Button>
            )}
            <GridSettings
              layout={layout}
              onLayoutChange={setLayout}
              columns={HIDEABLE}
              visibility={visibility}
              onVisibilityChange={setVisibility}
            />
          </div>
        </div>
        <Separator />
        <DataGrid
          table={table}
          recordCount={shown.length}
          emptyMessage="No invoices match this view. Clear the filters to see the whole ledger."
          tableLayout={{
            dense: layout.dense,
            headerSticky: true,
            columnsVisibility: true,
            columnsResizable: layout.resizable,
            columnsMovable: layout.movable,
            width: "fixed",
          }}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
          <CardFooter className="rounded-b-xl border-t bg-muted/50 py-3">
            <DataGridPagination sizes={[10, 20, 50]} />
          </CardFooter>
        </DataGrid>
      </CardContent>
      {deleting && (
        <DeleteInvoiceDialog
          invoice={deleting}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
        />
      )}
    </Card>
  )
}
