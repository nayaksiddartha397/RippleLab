import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function createAccount(page: Page, suffix: string) {
  await page.goto("/auth/sign-up", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(`profile.${suffix}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("RippleLab-Profile-2026");
  await page.getByLabel("Confirm password").fill("RippleLab-Profile-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("financial profile", () => {
  test("requires authentication", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fprofile/);
  });

  test("creates, reloads and edits a profile", async ({ page, isMobile }) => {
    test.skip(isMobile, "Full persistence lifecycle is covered once on desktop Chromium.");
    await createAccount(page, "lifecycle");
    await page.goto("/profile", { waitUntil: "domcontentloaded" });

    await page.getByLabel("City").fill("Bengaluru");
    await page.getByLabel("Age", { exact: true }).fill("29");
    await page.getByLabel("Household size").fill("2");
    await page.getByLabel("Employment status").selectOption("salaried");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Monthly cash flow/ })).toBeVisible();

    await page.getByLabel("Take-home income (₹)").fill("-1");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Monthly cash flow/ })).toBeVisible();
    await page.getByLabel("Take-home income (₹)").fill("120000");
    await page.getByLabel("Other income (₹)").fill("10000");
    await page.getByLabel("Essential expenses (₹)").fill("45000");
    await page.getByLabel("Discretionary expenses (₹)").fill("15000");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Savings & investments/ })).toBeVisible();

    await page.getByLabel("Cash & savings accounts (₹)").fill("300000");
    await page.getByLabel("Fixed deposits (₹)").fill("200000");
    await page.getByLabel("Equity & mutual funds (₹)").fill("450000");
    await page.getByLabel("Other investments (₹)").fill("50000");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Home & loans/ })).toBeVisible();

    await page.getByLabel("Housing status").selectOption("homeowner_with_mortgage");
    await page.getByLabel("Monthly rent (₹)").fill("0");
    await page.getByLabel("Estimated home value (₹)").fill("9000000");
    await page.getByLabel("Outstanding home loan (₹)").fill("4800000");
    await page.getByLabel("Outstanding other loans (₹)").fill("100000");
    await page.getByLabel("Total monthly EMI (₹)").fill("36000");
    await page.getByLabel("Average loan interest (%)").fill("101");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Home & loans/ })).toBeVisible();
    await page.getByLabel("Average loan interest (%)").fill("8.65");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("group", { name: /Goal & consent/ })).toBeVisible();

    await page.getByLabel("Primary financial goal").selectOption("home_purchase");
    await page.getByLabel("Goal target (₹)").fill("15000000");
    await page.getByLabel("Goal horizon (years)").fill("8");
    await page.getByLabel("I understand how this profile will be used.").check();
    await page.getByRole("button", { name: "Save financial profile" }).click();
    await expect(page.getByText("Financial profile saved securely.")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Ready for personal scenarios" })).toBeVisible();
    await expect(page.getByLabel("City")).toHaveValue("Bengaluru");
    await expect(page.getByLabel("Age", { exact: true })).toHaveValue("29");

    await page.getByLabel("City").fill("Pune");
    await page.getByRole("button", { name: "Goal & consent" }).click();
    await page.getByRole("button", { name: "Update financial profile" }).click();
    await expect(page.getByText("Financial profile saved securely.")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("City")).toHaveValue("Pune");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("₹34,000")).toBeVisible();
    await expect(page.getByText("₹49,00,000")).toBeVisible();
  });

  test("profile editor has no serious accessibility violations", async ({ page }, testInfo) => {
    await createAccount(page, `a11y-${testInfo.project.name}`);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Build your financial starting point." })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockingViolations = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
    expect(blockingViolations).toEqual([]);

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("link", { name: "Financial profile" })).toBeVisible();
    }
  });
});
