import { expect, test } from "./fixtures"
import { ROUTES } from "./routes"

// Every page at this project's viewport (desktop and phone): nothing scrolls sideways (a grid may scroll inside
// itself), and on a phone every text field is 16px, so iPhone Safari doesn't zoom when one is tapped.
for (const route of ROUTES) {
  test(`${route.path} fits the viewport`, async ({ page }) => {
    await page.goto(route.path)
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading })
    ).toBeVisible()
    await page.waitForLoadState("networkidle")
    const found = await page.evaluate(() => {
      const width = document.documentElement.clientWidth
      const overflow = document.documentElement.scrollWidth - width
      // Past the right edge, unless a scroll container of its own clips it
      const clipped = (el: Element) => {
        for (
          let p = el.parentElement;
          p && p !== document.body;
          p = p.parentElement
        )
          if (getComputedStyle(p).overflowX !== "visible") return true
        return false
      }
      const past = [...document.querySelectorAll("main *, header *")]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > width + 1 && !clipped(el)
        })
        .slice(0, 3)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".")}`
        )
      const small =
        width < 640
          ? [
              ...document.querySelectorAll(
                "input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select"
              ),
            ]
              .filter(
                (el) =>
                  (el as HTMLElement).offsetParent &&
                  Number.parseFloat(getComputedStyle(el).fontSize) < 16
              )
              .map(
                (el) =>
                  el.id ||
                  el.getAttribute("name") ||
                  el.getAttribute("aria-label") ||
                  el.tagName
              )
          : []
      return { overflow, past, small }
    })
    expect
      .soft(found.overflow, "the page scrolls sideways")
      .toBeLessThanOrEqual(0)
    expect.soft(found.past, "past the right edge").toEqual([])
    expect.soft(found.small, "fields under 16px").toEqual([])
  })
}
