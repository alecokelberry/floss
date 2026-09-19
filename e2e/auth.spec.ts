import { expect, test } from "./fixtures"
import { ROUTES } from "./routes"

// The first page on the list past the home page (which sends a signed-out visitor to sign in without a `next`)
const path = ROUTES.find((r) => r.path !== "/")?.path ?? "/"
const escaped = path.replaceAll("/", "\\/").replaceAll("?", "\\?")

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("a page sends you to sign in, back once you have, and out again", async ({
    page,
    expectAccessible,
  }) => {
    await page.goto(path)
    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?next=${encodeURIComponent(path)}$`)
    )
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expectAccessible()
    await page.getByRole("button", { name: /^Sign in as / }).click()
    await expect(page).toHaveURL(new RegExp(`${escaped}$`))
    // Signing out (this test's own session) lands back on sign-in, and the app stays shut. On a phone the account
    // menu is inside the sidebar's sheet.
    const profile = page.getByRole("button", { name: /^Open profile for / })
    if (!(await profile.isVisible()))
      await page.getByRole("button", { name: "Toggle Sidebar" }).first().click()
    await profile.click()
    await page.getByRole("menuitem", { name: "Sign Out" }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await page.goto(path)
    await expect(page).toHaveURL(/\/sign-in\?next=/)
  })
})
