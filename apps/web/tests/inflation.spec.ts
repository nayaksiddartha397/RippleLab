import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

const seededProfile = {
  age: 34,
  cashSavingsPaise: 60_000_000,
  city: "Bengaluru",
  employmentStatus: "salaried",
  equityInvestmentsPaise: 150_000_000,
  fixedDepositsPaise: 80_000_000,
  goalHorizonYears: 8,
  goalTargetPaise: 1_500_000_000,
  homeValuePaise: 1_200_000_000,
  householdSize: 2,
  housingStatus: "homeowner_with_mortgage",
  monthlyDiscretionaryExpensesPaise: 2_500_000,
  monthlyEmiPaise: 5_200_000,
  monthlyEssentialExpensesPaise: 5_500_000,
  monthlyOtherIncomePaise: 0,
  monthlyRentPaise: 0,
  monthlyTakeHomePaise: 18_000_000,
  otherInvestmentsPaise: 0,
  outstandingHomeLoanPaise: 650_000_000,
  outstandingOtherLoansPaise: 0,
  primaryGoal: "debt_repayment",
  updatedAt: "2026-08-15T08:00:00.000Z",
  weightedLoanRateBps: 850,
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function seedSignedInProfile(context: BrowserContext) {
  await context.addCookies([
    {
      domain: "localhost",
      name: "ripplelab-test-session",
      path: "/",
      value: encode({ email: "inflation@example.com" }),
    },
    {
      domain: "localhost",
      name: "ripplelab-test-profile",
      path: "/",
      value: encode(seededProfile),
    },
  ]);
}

test.describe("personal inflation engine", () => {
  test("requires authentication", async ({ page }) => {
    await page.goto("/scenarios/inflation", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fscenarios%2Finflation/);
  });

  test("reprices a saved household basket and updates a category assumption", async ({ context, page, isMobile }) => {
    test.skip(isMobile, "The complete inflation lifecycle is covered once on desktop Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/inflation", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "See which prices put pressure on your household." }),
    ).toBeVisible();
    await expect(page.getByLabel("Food and groceries (₹/month)")).toHaveValue("22000");
    await page.getByRole("button", { name: "Calculate inflation impact" }).click();

    await expect(
      page.locator(".repo-net-result").getByText("-₹16,608.00", { exact: true }),
    ).toBeVisible();
    const outputs = page.getByLabel("Inflation outputs");
    await expect(outputs.getByText("5.19%", { exact: true })).toBeVisible();
    await expect(outputs.getByText("₹84,152.00", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "-₹6,048.00" })).toBeVisible();
    await expect(page.getByText(/no LLM calculates money/)).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Trace headline inflation through your basket and purchasing power",
      }),
    ).toBeVisible();

    const inspector = page.getByTestId("causal-inspector");
    await page
      .getByRole("button", { name: /Personal basket inflation, Household node, 5.19%/ })
      .click();
    await expect(inspector.getByRole("heading", { name: "Personal basket inflation" })).toBeVisible();
    await expect(inspector.getByText("inflation.personal_basket.v1")).toBeVisible();
    await expect(inspector.getByText("Food and groceries spend")).toBeVisible();
    await expect(
      inspector.getByRole("link", { name: "National Metadata Structure for Consumer Price Index" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);

    await page.getByLabel("Food and groceries price pass-through (%)").fill("50");
    await page.getByRole("button", { name: "Calculate inflation impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("-₹13,968.00", { exact: true }),
    ).toBeVisible();
  });

  test("keeps the larger inflation graph usable on a small screen", async ({ context, page, isMobile }) => {
    test.skip(!isMobile, "The narrow-layout inflation journey is covered on mobile Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/inflation", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Calculate inflation impact" }).click();

    await page
      .getByRole("button", { name: /Real portfolio return, Outcome node, 1.72%/ })
      .click();
    await expect(
      page.getByTestId("causal-inspector").getByRole("heading", { name: "Real portfolio return" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
