"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts"

import { ToneBadge } from "@/components/shared/tone-badge"
import { Card, CardContent } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { CHART_SERIES } from "@/lib/tones"

// The practice's month and year at a glance: fixed numbers (the day's own sheet is below).
// September's visits by procedure, done so far against booked, and the last twelve months of appointments and the
// patients they saw.
const PROCEDURE_MIX = [
  { name: "Exam", completed: 142, scheduled: 168 },
  { name: "Cleaning", completed: 156, scheduled: 181 },
  { name: "Filling", completed: 64, scheduled: 71 },
  { name: "Root Canal", completed: 21, scheduled: 26 },
  { name: "Crown", completed: 29, scheduled: 35 },
  { name: "Extraction", completed: 17, scheduled: 19 },
  { name: "Braces", completed: 88, scheduled: 94 },
  { name: "Implant", completed: 9, scheduled: 12 },
  { name: "Cosmetic", completed: 14, scheduled: 18 },
]

const PATIENT_VOLUME = [
  ["Oct", 684, 942],
  ["Nov", 652, 901],
  ["Dec", 571, 788],
  ["Jan", 703, 968],
  ["Feb", 668, 917],
  ["Mar", 721, 994],
  ["Apr", 709, 976],
  ["May", 735, 1012],
  ["Jun", 690, 951],
  ["Jul", 612, 846],
  ["Aug", 748, 1031],
  ["Sep", 762, 1049],
].map(([month, patientsSeen, appointments]) => ({
  month,
  patientsSeen,
  appointments,
}))

const mixConfig = {
  completed: { label: "Completed", color: CHART_SERIES.completed },
  scheduled: { label: "Scheduled", color: CHART_SERIES.scheduled },
} satisfies ChartConfig

const volumeConfig = {
  patientsSeen: { label: "Patients Seen", color: CHART_SERIES.newPatients },
  appointments: { label: "Appointments", color: CHART_SERIES.appointments },
} satisfies ChartConfig

/** The chart card: the ring card with two corner marks, a title over its subtitle, something at the right */
function ChartCard({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string
  subtitle: string
  aside: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="relative p-0">
      <span
        aria-hidden
        className="absolute top-0 left-0 size-2 border-t border-l border-foreground/65"
      />
      <span
        aria-hidden
        className="absolute right-0 bottom-0 size-2 border-r border-b border-foreground/65"
      />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm leading-4 font-semibold">{title}</h2>
            <p className="text-xs leading-4 text-muted-foreground">
              {subtitle}
            </p>
          </div>
          {aside}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

/** The chart tooltip: the page's background, a ruled header, a dot, label and value per series */
function ChartTip({
  active,
  payload,
  label,
  config,
  heading,
  order = Object.keys(config),
}: Partial<TooltipContentProps<number, string>> & {
  config: ChartConfig
  heading: (label: string) => string
  /** The rows' order, when it isn't the config's */
  order?: string[]
}) {
  if (!active || !payload?.length) return null
  // The chart's own order, not the stack's
  const rows = order
    .map((key) => payload.find((p) => p.dataKey === key))
    .filter((p) => p !== undefined)
  return (
    <div className="flex min-w-32 flex-col gap-2 rounded-lg border border-foreground/5 bg-background px-2.5 py-1.5 text-xs">
      <div className="border-b border-foreground/5 pb-2 font-medium">
        {heading(String(label))}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((p) => {
          const key = String(p.dataKey)
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex flex-1 items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: `var(--color-${key})` }}
                />
                {config[key]?.label}
              </span>
              <span className="font-semibold tabular-nums">
                {Number(p.value).toLocaleString("en-US")}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ config }: { config: ChartConfig }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-muted-foreground sm:justify-end">
      {Object.entries(config).map(([key, c]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: c.color }}
          />
          {c.label}
        </span>
      ))}
    </div>
  )
}

const CHART_CLASS = "h-56 w-full min-w-0"

export function DashboardCharts() {
  return (
    <div className="grid gap-4 @4xl:grid-cols-2">
      <ChartCard
        title="Procedure Mix"
        subtitle="Chair Demand"
        aside={<Legend config={mixConfig} />}
      >
        <ChartContainer config={mixConfig} className={CHART_CLASS}>
          <BarChart
            accessibilityLayer
            data={PROCEDURE_MIX}
            margin={{ top: 8, left: 4, right: 4 }}
            barGap={3}
          >
            <defs>
              <pattern
                id="clinic-procedure-completed"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
              >
                <rect
                  width="8"
                  height="8"
                  fill="var(--color-completed)"
                  opacity="0.1"
                />
                <path
                  d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4"
                  stroke="var(--color-completed)"
                  strokeWidth="1.5"
                  opacity="0.55"
                />
                <path
                  d="M2,10 L10,2 M6,14 L14,6 M-2,6 L6,-2"
                  stroke="var(--color-completed)"
                  strokeWidth="1"
                  opacity="0.25"
                />
              </pattern>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeOpacity={0.75}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={10}
            />
            <YAxis hide domain={[0, (max: number) => max + 4]} />
            <Tooltip
              cursor={false}
              position={{ y: 8 }}
              isAnimationActive={false}
              content={
                <ChartTip config={mixConfig} heading={(label) => label} />
              }
            />
            <Bar
              dataKey="completed"
              fill="url(#clinic-procedure-completed)"
              stroke="var(--color-completed)"
              strokeWidth={1}
              barSize={17}
              radius={5}
            />
            <Bar
              dataKey="scheduled"
              fill="var(--color-scheduled)"
              fillOpacity={0.86}
              stroke="var(--color-scheduled)"
              strokeWidth={1}
              barSize={17}
              radius={5}
            />
          </BarChart>
        </ChartContainer>
      </ChartCard>
      <ChartCard
        title="Patient Volume"
        subtitle="Appointments and patients seen"
        aside={
          <ToneBadge tone="success-light" radius="full">
            +6.4%
          </ToneBadge>
        }
      >
        <ChartContainer config={volumeConfig} className={CHART_CLASS}>
          <AreaChart
            accessibilityLayer
            data={PATIENT_VOLUME}
            margin={{ top: 20, left: 0, right: 0 }}
          >
            <defs>
              {Object.keys(volumeConfig).map((key) => (
                <pattern
                  key={key}
                  id={`clinic-volume-crosshatch-${key}`}
                  x="0"
                  y="0"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0,8 L8,0"
                    stroke={`var(--color-${key})`}
                    strokeWidth="0.8"
                    opacity="0.4"
                  />
                  <path
                    d="M0,0 L8,8"
                    stroke={`var(--color-${key})`}
                    strokeWidth="0.8"
                    opacity="0.2"
                  />
                </pattern>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeOpacity={0.75}
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <Tooltip
              position={{ y: 20 }}
              isAnimationActive={false}
              content={
                <ChartTip
                  config={volumeConfig}
                  heading={(label) => `${label} 2026`}
                  // Top to bottom, as the stacked bands read
                  order={Object.keys(volumeConfig).toReversed()}
                />
              }
            />
            {Object.keys(volumeConfig).map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                stackId="volume"
                stroke={`var(--color-${key})`}
                strokeWidth={1.25}
                fill={`url(#clinic-volume-crosshatch-${key})`}
                fillOpacity={0.5}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}
