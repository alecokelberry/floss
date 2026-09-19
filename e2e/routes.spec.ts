import { expect, test } from "./fixtures"
import { ROUTES } from "./routes"

// Every page loads without errors, shows its heading and passes axe
for (const route of ROUTES) {
  test(`${route.path} loads and is accessible`, async ({
    page,
    pageErrors,
    expectAccessible,
  }) => {
    await page.goto(route.path)
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading })
    ).toBeVisible()
    await page.waitForLoadState("networkidle")
    await expectAccessible()
    expect(pageErrors).toEqual([])
  })
}
