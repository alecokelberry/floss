// The Filters bar's conditions, applied to rows (Patients, Payments): a text field against its operators, and a
// field holding several values (an invoice's treatments) against "has any of", "has all of" and "has none of".

/** One condition of the Filters bar against a row's value (a text, or a select's id) */
export function matchRule(
  value: string,
  operator: string,
  wanted: unknown,
  negated = false
): boolean {
  const v = value.toLowerCase()
  const w = typeof wanted === "string" ? wanted.toLowerCase() : ""
  const list = Array.isArray(wanted) ? (wanted as string[]) : []
  let hit: boolean
  switch (operator) {
    case "contains":
      hit = v.includes(w)
      break
    case "not_contains":
      hit = !v.includes(w)
      break
    case "starts_with":
      hit = v.startsWith(w)
      break
    case "ends_with":
      hit = v.endsWith(w)
      break
    case "is":
      hit = v === w
      break
    case "is_not":
      hit = v !== w
      break
    case "is_any_of":
      hit = list.includes(value)
      break
    case "is_none_of":
      hit = !list.includes(value)
      break
    case "empty":
      hit = !value
      break
    case "not_empty":
      hit = Boolean(value)
      break
    default:
      hit = true
  }
  return negated ? !hit : hit
}

/** Whether a condition is ready to filter: an operator, and a value unless it takes none */
export function ruleReady(operator: string, wanted: unknown) {
  if (!operator) return false
  if (operator === "empty" || operator === "not_empty") return true
  if (Array.isArray(wanted)) return wanted.length > 0
  return typeof wanted === "string" && wanted.length > 0
}

/** A condition against a row's values (one or several), for the list operators */
export function matchValues(
  values: string[],
  operator: string,
  wanted: unknown,
  negated = false
): boolean {
  const list = Array.isArray(wanted) ? (wanted as string[]) : []
  let hit: boolean
  switch (operator) {
    case "has_any_of":
      hit = list.some((w) => values.includes(w))
      break
    case "has_all_of":
      hit = list.every((w) => values.includes(w))
      break
    case "has_none_of":
      hit = !list.some((w) => values.includes(w))
      break
    case "empty":
      hit = values.length === 0
      break
    case "not_empty":
      hit = values.length > 0
      break
    default:
      return matchRule(values.join(" "), operator, wanted, negated)
  }
  return negated ? !hit : hit
}
