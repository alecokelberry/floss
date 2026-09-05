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
  CalendarCheckIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  FileTextIcon,
  FunnelIcon,
  FunnelXIcon,
  GitBranchIcon,
  MailIcon,
  PencilLineIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import { useState, useTransition } from "react"

import { verifyInsurance } from "@/app/actions/front-desk"
import { assignPractitioner } from "@/app/actions/patients"
import { RecallBadge, VerifyBadge } from "@/components/front-desk/badges"
import { PatientAvatar, PractitionerAvatar } from "@/components/shared/avatars"
import { GridSettings } from "@/components/shared/grid-settings"
import { ToneBadge } from "@/components/shared/tone-badge"
import {
  RemovePatientDialog,
  StageBadge,
} from "@/components/sheets/patient-sheet"
import { usePractice } from "@/components/shell/practice"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import type { DirectoryPatient } from "@/db/queries/patients"
import { openSheet } from "@/hooks/use-sheet"
import { outcome } from "@/lib/action-result"
import { shortDay, startOfDay } from "@/lib/dates"
import { matchRule, ruleReady } from "@/lib/filters"
import { verification, verificationLabel } from "@/lib/insurance"
import { ago, STAGES } from "@/lib/patients"
import {
  RECALL_STATUS_LABEL,
  type RecallStatus,
  recallDue,
  recallStatus,
} from "@/lib/recall"
import { PATIENT_STAGE } from "@/lib/tones"

/** A patient with where they stand on recall and whether their benefits are checked, as of the clinic's today */
type Row = DirectoryPatient & {
  due: Date | null
  recall: RecallStatus | null
  benefits: ReturnType<typeof verification>
}

const BENEFITS = [
  ["verified", "Verified"],
  ["stale", "Checked over 30 days ago"],
  ["never", "Not verified"],
  ["self-pay", "Self-pay"],
] as const
const RECALLS: RecallStatus[] = ["overdue", "due", "scheduled", "current"]

const ACTIVITY_ICON = {
  booked: CalendarPlusIcon,
  rescheduled: RefreshCwIcon,
  status: CalendarCheckIcon,
  updated: RefreshCwIcon,
  cancelled: CalendarXIcon,
}

/** The columns a person can hide, in the Columns menu's and Settings' order */
const HIDEABLE = [
  ["contact", "Contact"],
  ["practitioner", "Practitioner"],
  ["stage", "Stage"],
  ["recall", "Recall"],
  ["benefits", "Benefits"],
  ["lastActivity", "Last Activity"],
  ["bookings", "Bookings"],
] as const

const emptyQuery = () =>
  createFilterQuery([
    createFilterRule({ id: "name-0", path: ["name"], operator: "contains" }),
  ])

/** What a Filters field reads off a patient */
function fieldValue(p: Row, field: string) {
  switch (field) {
    case "name":
      return p.name
    case "email":
      return p.email
    case "chart":
      return p.chart
    case "practitioner":
      return p.practitionerId ?? ""
    case "stage":
      return p.stage
    case "recall":
      return p.recall ?? ""
    case "benefits":
      return p.benefits.state
    default:
      return ""
  }
}

/**
 * The Patients card: the count and who owes, Export; Filters (Name, Email, Chart, Practitioner, Stage), Clear
 * and the table Settings; group actions for a selection; the DataGrid (sort, move, resize and hide columns, a row
 * menu per patient) and its pagination.
 */
export function PatientsGrid({
  patients: directory,
}: {
  patients: DirectoryPatient[]
}) {
  const { practitioners, renderedAt } = usePractice()
  const today = startOfDay(renderedAt)
  const patients: Row[] = directory.map((p) => {
    const due = recallDue(p)
    return {
      ...p,
      due,
      recall: due && recallStatus(due, p.nextHygiene, today),
      benefits: verification(p, today),
    }
  })
  const [query, setQuery] = useState<FilterQuery>(emptyQuery)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "patient", desc: false },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>({
    lastActivity: false,
    contact: false,
  })
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [dense, setDense] = useState(true)
  const [resizable, setResizable] = useState(true)
  const [movable, setMovable] = useState(true)
  const [removing, setRemoving] = useState<Row | null>(null)
  const [pending, startTransition] = useTransition()

  const assigned = practitioners.filter((d) =>
    patients.some((p) => p.practitionerId === d.id)
  )
  // The practitioners with patients, in the order their first patient appears
  const withPatients = [
    ...new Set(patients.map((p) => p.practitionerId).filter(Boolean)),
  ]
    .map((id) => assigned.find((d) => d.id === id))
    .filter((d) => d !== undefined)
  const [assignTo, setAssignTo] = useState(withPatients[0]?.id ?? "")

  const rules = flattenFilterRules(query).filter((r) =>
    ruleReady(r.operator, r.value)
  )
  const shown = patients.filter((p) =>
    rules.every((r) =>
      matchRule(fieldValue(p, r.path[0] ?? ""), r.operator, r.value, r.negated)
    )
  )
  const unpaidPatients = patients.filter((p) => p.unpaid > 0).length

  const fields: FilterField[] = [
    {
      id: "name",
      label: "Name",
      icon: <UserIcon />,
      type: "text",
      placeholder: "Search patients...",
      defaultOperator: "contains",
    },
    {
      id: "email",
      label: "Email",
      icon: <MailIcon />,
      type: "text",
      placeholder: "name@example.com",
      defaultOperator: "contains",
    },
    {
      id: "chart",
      label: "Chart",
      icon: <FileTextIcon />,
      type: "text",
      placeholder: "PT-0000",
      defaultOperator: "contains",
    },
    {
      id: "practitioner",
      label: "Practitioner",
      icon: <UsersIcon />,
      type: "select",
      options: withPatients.map((d) => ({ value: d.id, label: d.name })),
    },
    {
      id: "stage",
      label: "Stage",
      icon: <GitBranchIcon />,
      type: "select",
      options: STAGES.map((s) => ({ value: s, label: PATIENT_STAGE[s].label })),
    },
    {
      id: "recall",
      label: "Recall",
      icon: <SparklesIcon />,
      type: "select",
      options: RECALLS.map((r) => ({
        value: r,
        label: RECALL_STATUS_LABEL[r],
      })),
    },
    {
      id: "benefits",
      label: "Benefits",
      icon: <ShieldCheckIcon />,
      type: "select",
      options: BENEFITS.map(([value, label]) => ({ value, label })),
    },
  ]

  const columns: ColumnDef<DataGridFeatures, Row>[] = [
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
      accessorFn: (p) => p.name,
      header: ({ column }) => (
        <DataGridColumnHeader title="Patient" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <PatientAvatar patient={p} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{p.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {p.chart}
            </span>
          </div>
        </div>
      ),
      enableHiding: false,
      size: 240,
      meta: { fillWidth: true },
    },
    {
      id: "contact",
      accessorFn: (p) => p.phone,
      header: ({ column }) => (
        <DataGridColumnHeader title="Contact" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          {p.phone && <span className="truncate font-medium">{p.phone}</span>}
          {p.email && (
            <span
              title={p.email}
              className="truncate text-xs text-muted-foreground"
            >
              {p.email}
            </span>
          )}
        </div>
      ),
      size: 180,
    },
    {
      id: "practitioner",
      accessorFn: (p) => p.practitioner?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader title="Practitioner" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) =>
        p.practitioner ? (
          <div className="flex min-w-0 items-center gap-2">
            <PractitionerAvatar practitioner={p.practitioner} size={24} />
            <span className="truncate">{p.practitioner.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
      size: 160,
    },
    {
      id: "stage",
      accessorFn: (p) => PATIENT_STAGE[p.stage].label,
      header: ({ column }) => (
        <DataGridColumnHeader title="Stage" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) => <StageBadge stage={p.stage} />,
      size: 130,
    },
    {
      id: "recall",
      accessorFn: (p) => p.due?.getTime() ?? Infinity,
      header: ({ column }) => (
        <DataGridColumnHeader title="Recall" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) =>
        p.due && p.recall ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="tabular-nums">{shortDay(p.due, today)}</span>
            {p.recall !== "current" && <RecallBadge status={p.recall} />}
          </div>
        ) : (
          <span className="text-muted-foreground">At first visit</span>
        ),
      size: 170,
    },
    {
      id: "benefits",
      accessorFn: (p) => verificationLabel(p.benefits),
      header: ({ column }) => (
        <DataGridColumnHeader title="Benefits" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) => (
        <span title={p.carrier ?? undefined}>
          <VerifyBadge state={p.benefits} />
        </span>
      ),
      size: 140,
    },
    {
      id: "lastActivity",
      accessorFn: (p) => p.lastActivity?.at.getTime() ?? 0,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Last Activity"
          column={column}
          visibility
        />
      ),
      cell: ({ row: { original: p } }) => {
        const a = p.lastActivity
        if (!a)
          return <span className="text-muted-foreground">No activity yet</span>
        const Icon = ACTIVITY_ICON[a.kind]
        return (
          <span
            title={a.line}
            className="flex min-w-0 items-center gap-1.5 text-muted-foreground"
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{ago(a.at, renderedAt)}</span>
          </span>
        )
      },
      size: 150,
    },
    {
      id: "bookings",
      accessorFn: (p) => p.upcoming,
      header: ({ column }) => (
        <DataGridColumnHeader title="Bookings" column={column} visibility />
      ),
      cell: ({ row: { original: p } }) =>
        p.upcoming || p.unpaid ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold tabular-nums">
              {p.upcoming} upcoming
            </span>
            {p.unpaid > 0 && (
              <span className="text-xs text-warning-ink">
                {p.unpaid} unpaid
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
      size: 110,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row: { original: p } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${p.name}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-42">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => openSheet({ kind: "edit-patient", id: p.id })}
              >
                <PencilLineIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openSheet({ kind: "patient", id: p.id })}
              >
                <EyeIcon />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openSheet({ kind: "message", patientId: p.id })}
              >
                <MailIcon />
                Send Reminder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const perio = p.recallMonths < 6
                  openSheet({
                    kind: "new-booking",
                    defaults: {
                      patientId: p.id,
                      procedureId: perio ? "perio-maint" : "scaling",
                      practitionerId: perio ? "weber" : "sato",
                    },
                  })
                }}
              >
                <CalendarPlusIcon />
                Book Cleaning
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!p.carrier}
                onClick={() =>
                  startTransition(async () => {
                    const result = outcome(await verifyInsurance(p.id))
                    toast.add(
                      result.ok
                        ? {
                            type: "success",
                            title: "Benefits verified",
                            description: result.message,
                          }
                        : { type: "error", title: result.error }
                    )
                  })
                }
              >
                <ShieldCheckIcon />
                Verify Benefits
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!p.email}
                onClick={() => {
                  void navigator.clipboard.writeText(p.email)
                  toast.add({
                    type: "success",
                    title: "Email copied",
                    description: p.email,
                  })
                }}
              >
                <CopyIcon />
                Copy Email
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setRemoving(p)}
              >
                <Trash2Icon />
                Delete
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
    getRowId: (p: Row) => String(p.id),
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
    enableColumnResizing: resizable,
    columnResizeMode: "onChange",
  })

  const selected = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number)

  function exportCsv() {
    const cell = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [
      "Patient,Chart,Phone,Email,Practitioner,Stage,Recall due,Recall,Dental plan,Benefits,Next treatment,Upcoming,Unpaid,Visits",
      ...shown.map((p) =>
        [
          p.name,
          p.chart,
          p.phone,
          p.email,
          p.practitioner?.name ?? "",
          PATIENT_STAGE[p.stage].label,
          p.due ? shortDay(p.due, today) : "",
          p.recall ? RECALL_STATUS_LABEL[p.recall] : "",
          p.carrier ?? "Self-pay",
          verificationLabel(p.benefits),
          p.nextTreatment ?? "",
          p.upcoming,
          p.unpaid,
          p.total,
        ]
          .map(cell)
          .join(",")
      ),
    ]
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = "patients.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.add({
      type: "success",
      title: "Directory exported",
      description: `${shown.length} ${shown.length === 1 ? "patient" : "patients"} written to patients.csv.`,
    })
  }

  function assign() {
    const ids = selected
    startTransition(async () => {
      const result = outcome(
        await assignPractitioner({ ids, practitionerId: assignTo })
      )
      if (!result.ok) {
        toast.add({ type: "error", title: result.error })
        return
      }
      setRowSelection({})
      toast.add({
        type: "success",
        title: "Practitioner assigned",
        description: result.message,
      })
    })
  }

  const hasChips = flattenFilterRules(query).length > 0

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3 pb-3!">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-semibold">Patients</CardTitle>
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <span>{patients.length} patients</span>
            <span
              aria-hidden
              className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
            />
            <span>{unpaidPatients} with unpaid visits</span>
          </CardDescription>
        </div>
        <Button
          variant="outline"
          aria-label="Export the directory"
          className="has-data-[icon=inline-start]:pl-2.5"
          onClick={exportCsv}
        >
          <DownloadIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Export</span>
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
              <Button variant="outline" aria-label="Filters">
                <FunnelIcon data-icon="inline-start" />
                Filters
              </Button>
            }
          />
          <div className="flex shrink-0 items-center gap-2">
            {hasChips && (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setQuery(emptyQuery())}
              >
                <FunnelXIcon data-icon="inline-start" className="size-3.5" />
                Clear
              </Button>
            )}
            <GridSettings
              layout={{ dense, resizable, movable }}
              onLayoutChange={(l) => {
                setDense(l.dense)
                setResizable(l.resizable)
                setMovable(l.movable)
              }}
              columns={HIDEABLE}
              visibility={visibility}
              onVisibilityChange={setVisibility}
            />
          </div>
        </div>
        {selected.length > 0 ? (
          <div className="flex flex-col gap-2 border-y bg-muted/30 px-4 py-1.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ToneBadge tone="neutral">Group actions</ToneBadge>
                <Badge variant="outline">{selected.length} selected</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Reassign a practitioner or add to a recall list.
              </p>
            </div>
            <div className="flex max-w-131 flex-wrap items-center justify-end gap-2">
              <Select
                items={withPatients.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={assignTo}
                onValueChange={(v) => setAssignTo(v as string)}
              >
                <SelectTrigger className="w-47.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {withPatients.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setRowSelection({})}>
                Deselect
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const n = selected.length
                  setRowSelection({})
                  toast.add({
                    type: "success",
                    title: "Added to recall list",
                    description: `${n} ${n === 1 ? "patient" : "patients"} queued for a recall call.`,
                  })
                }}
              >
                Add to list
              </Button>
              <Button disabled={pending || !assignTo} onClick={assign}>
                Assign practitioner
              </Button>
            </div>
          </div>
        ) : (
          <Separator />
        )}
        <DataGrid
          table={table}
          recordCount={shown.length}
          emptyMessage="No patients match these filters. Clear them to see the whole directory."
          tableLayout={{
            dense,
            headerSticky: true,
            columnsVisibility: true,
            columnsResizable: resizable,
            columnsMovable: movable,
            width: "fixed",
          }}
          tableClassNames={{
            headerSticky: "bg-background/90 backdrop-blur-xs",
          }}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
          <CardFooter className="rounded-b-xl border-t bg-muted/50 py-3">
            <DataGridPagination sizes={[5, 10, 20]} />
          </CardFooter>
        </DataGrid>
      </CardContent>
      {removing && (
        <RemovePatientDialog
          patient={removing}
          open
          onOpenChange={(o) => !o && setRemoving(null)}
          from="row"
        />
      )}
    </Card>
  )
}
