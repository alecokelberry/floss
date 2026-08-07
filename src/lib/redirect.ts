import type { Route } from "next"

/**
 * Where to go after signing in: the page the proxy sent them from, if it's a path on this site. Anything else
 * (another origin, "//host", a backslash trick, a tab or newline browsers strip to make "//host") falls back to
 * the Dashboard, so a crafted link can't bounce a signed-in user somewhere else.
 */
export function safeNextPath(next: string | string[] | undefined): Route {
  const path = Array.isArray(next) ? next[0] : next
  if (
    !path ||
    // oxlint-disable-next-line no-control-regex -- refusing control characters is the point
    /[\u0000-\u001f\u007f]/.test(path) ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  )
    return "/"
  // The browser's own reading of it has to stay on this site
  const base = "http://floss.invalid"
  let url: URL
  try {
    url = new URL(path, base)
  } catch {
    return "/"
  }
  if (url.origin !== base || url.pathname === "/sign-in") return "/"
  return path as Route
}
