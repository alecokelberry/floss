// The demo's one account. A synthetic person, and a password that's printed on the sign-in page on purpose: this is a
// portfolio demo on a local database, so anyone looking at it should be able to get in.
/** The demo password, shown on the sign-in page */
export const DEMO_PASSWORD = "floss-demo-2026"

/**
 * Who signs in: Dana Whitaker, the practice manager, the one account the demo signs in as.
 */
export const DEMO_STAFF = [
  {
    id: "staff-dana",
    name: "Dana Whitaker",
    email: "d.whitaker@larkspur.example",
    title: "Practice manager",
    photo: "/avatars/staff/dana.jpg",
  },
] as const satisfies readonly {
  id: string
  name: string
  email: string
  title: string
  photo: string
}[]

/** What an account does at the practice ("Practice manager"), for the account menu */
export function staffTitle(email: string): string | undefined {
  return DEMO_STAFF.find((s) => s.email === email)?.title
}

/** The account the sign-in card and the browser tests sign in as */
export const DEMO_ACCOUNT = DEMO_STAFF[0]
