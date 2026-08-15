// The app's color vocabulary, in one place so
// components name a meaning, never a hue: booking statuses, planner categories, the board's log kinds and the twelve
// chair colors. Colors are CSS values (Tailwind's palette variables) that components pass as `--tone`.
import type {
  BookingStatus,
  ChairColor,
  EventKind,
  PatientStage,
  PlanStatus,
  TaskCategory,
} from "@/db/schema"
import type { Verification } from "@/lib/insurance"
import type { RecallStatus } from "@/lib/recall"

/** Badge variants the badges map to (light badge recipe: text, /15 fill, /25 border in dark) */
export type BadgeTone =
  | "success-light"
  | "info-light"
  | "warning-light"
  | "destructive-light"
  | "secondary"
  | "neutral"
  | "zinc"

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; chip: string; badge: BadgeTone }
> = {
  booked: {
    label: "Booked",
    chip: "var(--color-slate-500)",
    badge: "zinc",
  },
  arrived: {
    label: "Arrived",
    chip: "var(--color-sky-500)",
    badge: "info-light",
  },
  in_chair: {
    label: "In Chair",
    chip: "var(--color-violet-500)",
    badge: "neutral",
  },
  completed: {
    label: "Completed",
    chip: "var(--color-emerald-500)",
    badge: "success-light",
  },
  unpaid: {
    label: "Unpaid",
    chip: "var(--color-amber-500)",
    badge: "warning-light",
  },
  cancelled: {
    label: "Cancelled",
    chip: "var(--color-rose-500)",
    badge: "destructive-light",
  },
}

/** Blocks on the calendar (Lunch, Case Review…): slate, no badge */
export const BLOCK_CHIP = "var(--color-slate-400)"

export const TASK_CATEGORY: Record<
  TaskCategory,
  {
    label: string
    /** Chip fill and dots */
    color: string
    /** The chip's solid badge in dark, near-black text on it */
    solid: string
    /** The same badge in light, white text on it */
    solidLight: string
    /** The Agenda panel's badge */
    badge: BadgeTone
  }
> = {
  procedure: {
    label: "Procedure",
    color: "var(--color-amber-500)",
    solid: "var(--color-amber-400)",
    solidLight: "var(--color-amber-700)",
    badge: "warning-light",
  },
  task: {
    label: "Task",
    color: "var(--color-slate-500)",
    solid: "var(--color-slate-400)",
    solidLight: "var(--color-slate-700)",
    badge: "secondary",
  },
  insurance: {
    label: "Insurance",
    color: "var(--color-indigo-500)",
    solid: "var(--color-indigo-400)",
    solidLight: "var(--color-indigo-700)",
    badge: "destructive-light",
  },
  call: {
    label: "Call",
    color: "var(--color-sky-500)",
    solid: "var(--color-sky-400)",
    solidLight: "var(--color-sky-700)",
    badge: "neutral",
  },
  meeting: {
    label: "Meeting",
    color: "var(--color-violet-500)",
    solid: "var(--color-violet-400)",
    solidLight: "var(--color-violet-700)",
    badge: "info-light",
  },
  recall: {
    label: "Recall",
    color: "var(--color-emerald-500)",
    solid: "var(--color-emerald-400)",
    solidLight: "var(--color-emerald-700)",
    badge: "success-light",
  },
}

/** The board's log lines: their badge label and tone, and what the notification sentence says */
export const EVENT_KIND: Record<
  EventKind,
  {
    label: string
    badge: BadgeTone
    says: string
    /** Log History's icon tile: the color a soft IconTile tints itself with */
    tile: string
  }
> = {
  booked: {
    label: "Booked",
    badge: "info-light",
    says: "was booked in",
    tile: "text-violet-500",
  },
  rescheduled: {
    label: "Rescheduled",
    badge: "warning-light",
    says: "was moved",
    tile: "text-yellow-500",
  },
  status: {
    label: "Status",
    badge: "secondary",
    says: "changed status",
    tile: "text-foreground",
  },
  updated: {
    label: "Updated",
    badge: "neutral",
    says: "was updated",
    tile: "text-primary",
  },
  cancelled: {
    label: "Cancelled",
    badge: "destructive-light",
    says: "was cancelled",
    tile: "text-red-400",
  },
}

/** The twelve chair colors, as the calendar renders them */
export const CHAIR_COLOR: Record<ChairColor, string> = {
  tomato: "rgb(225, 29, 72)",
  flamingo: "rgb(220, 38, 38)",
  tangerine: "rgb(234, 88, 12)",
  banana: "rgb(234, 179, 8)",
  sage: "rgb(22, 163, 74)",
  basil: "rgb(13, 148, 136)",
  peacock: "rgb(37, 99, 235)",
  blueberry: "rgb(79, 70, 229)",
  lavender: "rgb(147, 51, 234)",
  grape: "rgb(192, 38, 211)",
  graphite: "rgb(107, 114, 128)",
  obsidian: "rgb(31, 41, 55)",
}

/** The Dashboard's KPI tiles (a solid fill under a white icon, the same in both themes) and their deltas */
export const KPI_TILE = {
  schedule: "bg-neutral-950",
  capacity: "bg-indigo-600",
  open: "bg-cyan-600",
  risk: "bg-amber-400",
}
export const KPI_DELTA = { good: "text-success-ink", bad: "text-danger-ink" }

/** The Day Breakdown's heat cells by step (src/lib/day-sheet.ts `heatStep`): emerald by share, Cancelled amber or red */
export const HEAT = {
  0: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  2: "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100",
  3: "bg-emerald-300 text-emerald-900 dark:bg-emerald-700 dark:text-emerald-50",
  none: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  some: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

/** The Dashboard's two charts */
export const CHART_SERIES = {
  completed: "var(--color-blue-600)",
  scheduled: "var(--color-sky-300)",
  appointments: "var(--color-yellow-500)",
  newPatients: "var(--color-emerald-500)",
}

/** A patient's stage: its label and the dot on its badge and portrait, in the Stage menu's order */
export const PATIENT_STAGE: Record<
  PatientStage,
  { label: string; dot: string }
> = {
  new: { label: "New", dot: "var(--color-sky-500)" },
  in_chair: { label: "In Chair", dot: "var(--color-violet-500)" },
  active: { label: "Active", dot: "var(--color-emerald-500)" },
  lapsed: { label: "Lapsed", dot: "var(--muted-foreground)" },
}

/** The Patients stat cards' colors: badge text, and the sparkline bars at 30% */
export const STAT_TONE = {
  violet: "var(--color-violet-500)",
  emerald: "var(--color-emerald-500)",
  amber: "var(--color-amber-400)",
}

/** The Staff lanes' icon tints, in the icons' cycle order (circle-dot, stethoscope, activity, clock, circle-check) */
export const LANE_TONE = [
  "text-sky-600 dark:text-sky-300",
  "text-indigo-600 dark:text-indigo-300",
  "text-violet-600 dark:text-violet-300",
  "text-cyan-600 dark:text-cyan-300",
  "text-emerald-600 dark:text-emerald-300",
]

/** The Staff board's four states: the badge dot, the time chip, and the card's emphasis */
export const BOARD_DOT = {
  done: "var(--muted-foreground)",
  in_chair: "var(--color-amber-500)",
  booked: "var(--color-sky-500)",
  unpaid: "var(--color-red-500)",
}
export const BOARD_CHIP = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-300",
  in_chair:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-300",
  booked:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  unpaid:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-400/35 dark:bg-red-400/10 dark:text-red-300",
  cancelled:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300",
}
export const BOARD_CARD = {
  done: "",
  booked: "",
  in_chair: "border-amber-300/70 dark:border-amber-400/35",
  unpaid:
    "border-red-300/90 bg-red-50/20 dark:border-red-400/40 dark:bg-red-950/10",
}

/** An invoice's standing badge */
export const INVOICE_TONE = {
  paid: "success-light",
  open: "info-light",
  past_due: "destructive-light",
} as const satisfies Record<string, BadgeTone>

/** The Activity timeline's dot by standing */
export const INVOICE_DOT = {
  paid: "bg-success",
  open: "bg-info",
  past_due: "bg-destructive",
}

/** A patient's stage as Search badges it */
export const STAGE_TONE = {
  new: "info-light",
  in_chair: "neutral",
  active: "success-light",
  lapsed: "secondary",
} as const satisfies Record<string, BadgeTone>

/** A treatment plan's answer: waiting on the patient, yes, or no */
export const PLAN_STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  proposed: "warning-light",
  accepted: "success-light",
  declined: "secondary",
}

/** Where a patient stands on recall */
export const RECALL_TONE: Record<RecallStatus, BadgeTone> = {
  overdue: "destructive-light",
  due: "warning-light",
  scheduled: "success-light",
  current: "secondary",
}

/** Whether a patient's benefits are checked */
export const VERIFY_TONE: Record<Verification["state"], BadgeTone> = {
  verified: "success-light",
  stale: "warning-light",
  never: "destructive-light",
  "self-pay": "secondary",
}
