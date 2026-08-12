"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  initialsOf,
  patientPhoto,
  practitionerPhoto,
  teamPhoto,
} from "@/lib/portraits"
import { cn } from "@/lib/utils"

/** A round portrait at any pixel size, the person's initials while it loads or when there's none */
export function Portrait({
  src,
  name,
  size = 32,
  className,
  children,
}: {
  src?: string
  name: string
  /** Pixels: 16, 20, 24, 28, 32, 36, 40 */
  size?: number
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Avatar
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback
        className="font-medium"
        style={{ fontSize: Math.max(8, Math.round(size * 0.36)) }}
      >
        {initialsOf(name)}
      </AvatarFallback>
      {children}
    </Avatar>
  )
}

export function PatientAvatar({
  patient,
  ...props
}: { patient: { chart: string; firstName: string; lastName: string } } & Omit<
  React.ComponentProps<typeof Portrait>,
  "src" | "name"
>) {
  return (
    <Portrait
      src={patientPhoto(patient.chart)}
      name={`${patient.firstName} ${patient.lastName}`}
      {...props}
    />
  )
}

/** A practitioner's portrait: their photo, the seeded file by id when the caller doesn't carry one, else initials */
export function PractitionerAvatar({
  practitioner,
  ...props
}: {
  practitioner: { id: string; name: string; photoUrl?: string | null }
} & Omit<React.ComponentProps<typeof Portrait>, "src" | "name">) {
  return (
    <Portrait
      src={
        practitioner.photoUrl === undefined
          ? practitionerPhoto(practitioner.id)
          : (practitioner.photoUrl ?? undefined)
      }
      name={practitioner.name}
      {...props}
    />
  )
}

/** A planner person by name, or bare initials ("RC") */
export function TeamAvatar({
  name,
  initials,
  ...props
}: { name: string | null; initials: string } & Omit<
  React.ComponentProps<typeof Portrait>,
  "src" | "name"
>) {
  return (
    <Portrait
      src={name ? teamPhoto(name) : undefined}
      name={name ?? initials}
      {...props}
    />
  )
}
