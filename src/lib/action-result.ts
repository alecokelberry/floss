/** What a write tells the page: the toast line (plus anything `Extra` carries), or why it was refused */
export type ActionResult<Extra = unknown> =
  | ({ ok: true; message: string } & Extra)
  | Refusal

export type Refusal = { ok: false; error: string }

/** A refusal before anything is written: a form's first problem, or a line of our own */
export const refuse = (error: string): Refusal => ({ ok: false, error })

/** What next-safe-action hands back from a call */
type SafeResult<D> =
  | { data?: D; serverError?: string; validationErrors?: unknown }
  | undefined

/** The first message in a Zod error tree (next-safe-action's `validationErrors`), in the order the fields failed */
function firstMessage(tree: unknown): string | undefined {
  if (!tree || typeof tree !== "object") return undefined
  for (const [key, value] of Object.entries(tree)) {
    const message =
      key === "_errors"
        ? (value as string[] | undefined)?.[0]
        : firstMessage(value)
    if (message) return message
  }
  return undefined
}

/** A write's outcome as the page reads it: the action's own result, or its first validation or server error */
export function outcome<D extends { ok: boolean }>(
  result: SafeResult<D>
): D | Refusal {
  if (result?.data) return result.data
  return refuse(
    firstMessage(result?.validationErrors) ??
      result?.serverError ??
      "Something went wrong. Try again."
  )
}
