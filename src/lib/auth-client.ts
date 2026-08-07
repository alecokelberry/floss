// Better Auth's browser client, same origin as the page (the dev server on this Mac, or its LAN name)
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient()
