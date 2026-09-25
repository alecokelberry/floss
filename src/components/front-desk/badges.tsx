"use client"

import { ShieldCheckIcon } from "lucide-react"
import { useTransition } from "react"

import { verifyInsurance } from "@/app/actions/front-desk"
import { ToneBadge } from "@/components/shared/tone-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { PlanStatus } from "@/db/schema"
import { outcome } from "@/lib/action-result"
import { type Verification, verificationLabel } from "@/lib/insurance"
import { RECALL_STATUS_LABEL, type RecallStatus } from "@/lib/recall"
import { PLAN_STATUS_TONE, RECALL_TONE, VERIFY_TONE } from "@/lib/tones"
import { PLAN_STATUS_LABEL } from "@/lib/treatment"

/** "Verified Sep 12", "Checked Jul 2", "Not verified" or "Self-pay", in its tone */
export function VerifyBadge({ state }: { state: Verification }) {
  return (
    <ToneBadge tone={VERIFY_TONE[state.state]} size="sm">
      {verificationLabel(state)}
    </ToneBadge>
  )
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return (
    <ToneBadge tone={PLAN_STATUS_TONE[status]} size="sm">
      {PLAN_STATUS_LABEL[status]}
    </ToneBadge>
  )
}

export function RecallBadge({ status }: { status: RecallStatus }) {
  return (
    <ToneBadge tone={RECALL_TONE[status]} size="sm">
      {RECALL_STATUS_LABEL[status]}
    </ToneBadge>
  )
}

/** Verify: the desk has called the carrier; it toasts what it did */
export function VerifyButton({
  patientId,
  name,
  size = "sm",
  onDone,
}: {
  patientId: number
  /** Whose benefits, for the button's accessible name */
  name: string
  size?: React.ComponentProps<typeof Button>["size"]
  /** After a successful verify, for a sheet to read its record again */
  onDone?: () => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      aria-label={`Verify ${name}'s benefits`}
      onClick={() =>
        startTransition(async () => {
          const result = outcome(await verifyInsurance(patientId))
          if (result.ok) onDone?.()
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
      <ShieldCheckIcon data-icon="inline-start" />
      Verify
    </Button>
  )
}
