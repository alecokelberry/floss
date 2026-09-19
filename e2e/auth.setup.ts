import { test as setup } from "@playwright/test"

import { DEMO_ACCOUNT, DEMO_PASSWORD } from "@/lib/demo-account"

// Signs in once as the demo account, through Better Auth's own endpoint; the other tests start from this session
setup("sign in", async ({ page, baseURL }) => {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: DEMO_ACCOUNT.email, password: DEMO_PASSWORD },
    headers: { origin: baseURL ?? "" },
  })
  if (!response.ok())
    throw new Error(
      `Sign-in failed (${response.status()}): is the database seeded?`
    )
  await page.context().storageState({ path: "e2e/.auth/state.json" })
})
