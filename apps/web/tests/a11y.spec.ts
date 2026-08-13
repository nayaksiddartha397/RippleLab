import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const route of ["/", "/design-system"]) {
  test(`${route} has no critical or serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveTitle(/RippleLab/);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockingViolations = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );

    expect(blockingViolations).toEqual([]);
  });
}

test("mobile navigation and dialog work by keyboard", async ({ page, isMobile }) => {
  test.skip(!isMobile, "This interaction is checked on the mobile project.");

  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Design system" })).toHaveAttribute(
    "href",
    "/design-system",
  );

  await page.goto("/design-system");

  await page.getByRole("button", { name: "Open example dialog" }).click();
  await expect(page.getByRole("dialog", { name: "Review your assumptions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Review your assumptions" })).toBeHidden();
});
