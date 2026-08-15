import { Badge, type BadgeProps } from "@/components/ui/badge"
import type { BookingStatus, TaskCategory } from "@/db/schema"
import { type BadgeTone, BOOKING_STATUS, TASK_CATEGORY } from "@/lib/tones"
import { cn } from "@/lib/utils"

/**
 * The badges by meaning: the light variants (text, /15 fill and /25 border in dark; the 900 ink on a
 * /10 fill in light), the secondary one, and two of its own: neutral (foreground tint, In Chair) and zinc (Booked).
 */
export function ToneBadge({
  tone,
  className,
  ...props
}: { tone: BadgeTone } & Omit<BadgeProps, "variant">) {
  if (tone === "neutral")
    return (
      <Badge
        className={cn(
          "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15",
          className
        )}
        {...props}
      />
    )
  if (tone === "zinc")
    return (
      <Badge
        className={cn(
          "border-foreground/15 bg-foreground/10 text-foreground dark:border-zinc-700/45 dark:bg-zinc-700/35",
          className
        )}
        {...props}
      />
    )
  return <Badge variant={tone} className={className} {...props} />
}

/** A booking's status as the calendar and its sheets badge it */
export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: BookingStatus
  size?: BadgeProps["size"]
  className?: string
}) {
  const s = BOOKING_STATUS[status]
  return (
    <ToneBadge tone={s.badge} size={size} className={className}>
      {s.label}
    </ToneBadge>
  )
}

/** A planner category's solid tag (the chips, hover cards and sheet): the 700 shade under white in light, the 400
 * shade under near-black in dark */
export function CategoryTag({
  category,
  className,
}: {
  category: TaskCategory
  className?: string
}) {
  const c = TASK_CATEGORY[category]
  return (
    <Badge
      className={cn(
        "border-transparent bg-(--tag) text-white dark:bg-(--tag-dark) dark:text-neutral-950",
        className
      )}
      style={
        { "--tag": c.solidLight, "--tag-dark": c.solid } as React.CSSProperties
      }
    >
      {c.label}
    </Badge>
  )
}
