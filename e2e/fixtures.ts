import { AxeBuilder } from "@axe-core/playwright"
import { test as base, expect, type Page } from "@playwright/test"

/** Fails on any WCAG 2.2 A/AA violation on the page as it is now */
async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(
    violations.map(
      ({ id, help, nodes }) =>
        `${id}: ${help} (${nodes.length}) at ${nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" | ")}`
    )
  ).toEqual([])
}

export const test = base.extend<{
  expectAccessible: () => Promise<void>
  pageErrors: string[]
}>({
  expectAccessible: async ({ page }, use) => {
    await use(() => expectAccessible(page))
  },
  // Uncaught errors in the page during the test; a test that checks them expects none
  pageErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await use(errors)
  },
})
export { expect }
