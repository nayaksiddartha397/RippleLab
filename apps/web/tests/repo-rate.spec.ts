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
  updatedAt: "2026-08-14T08:00:00.000Z",
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
      value: encode({ email: "repo.rate@example.com" }),
    },
    {
      domain: "localhost",
      name: "ripplelab-test-profile",
      path: "/",
      value: encode(seededProfile),
    },
  ]);
}

test.describe("repo-rate vertical slice", () => {
  test("requires authentication", async ({ page }) => {
    await page.goto("/scenarios/repo-rate", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fscenarios%2Frepo-rate/);
  });

  test("runs a saved profile through FastAPI and updates assumptions", async ({ context, page, isMobile }) => {
    test.skip(isMobile, "The complete calculation lifecycle is covered once on desktop Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/repo-rate", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Translate a repo-rate change into your cash flow." }),
    ).toBeVisible();
    await expect(page.getByText("₹65,00,000")).toBeVisible();
    await page.getByRole("button", { name: "Calculate my impact" }).click();

    await expect(
      page.locator(".repo-net-result").getByText("₹27,666.08", { exact: true }),
    ).toBeVisible();
    const deterministicOutputs = page.getByLabel("Deterministic outputs");
    await expect(page.getByText("₹64,008.07 before the reset")).toBeVisible();
    await expect(deterministicOutputs.getByText("₹61,369.23", { exact: true })).toBeVisible();
    await expect(deterministicOutputs.getByText("-₹4,000.00", { exact: true })).toBeVisible();
    await expect(page.getByText(/no LLM calculates money/)).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Trace the result from policy decision to personal cash flow",
      }),
    ).toBeVisible();

    const inspector = page.getByTestId("causal-inspector");
    await page
      .getByRole("button", { name: /Monthly EMI, Household node, ₹61,369.23/ })
      .click();
    await expect(inspector.getByRole("heading", { name: "Monthly EMI" })).toBeVisible();
    await expect(inspector.getByText("loan.floating_rate_reset.v1")).toBeVisible();
    await expect(inspector.getByText("Remaining home-loan term")).toBeVisible();

    const loanToEmiEdge = page.getByRole("button", {
      name: /Floating loan rate to Monthly EMI/,
    });
    await loanToEmiEdge.focus();
    await page.keyboard.press("Enter");
    await expect(
      inspector.getByRole("heading", { name: "Floating loan rate → Monthly EMI" }),
    ).toBeVisible();
    await expect(inspector.getByText("0-1 months")).toBeVisible();
    await expect(
      inspector.getByRole("link", { name: "Monetary Policy Framework" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);

    await page.getByLabel("Loan pass-through (%)").fill("50");
    await page.getByRole("button", { name: "Calculate my impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("₹18,688.16", { exact: true }),
    ).toBeVisible();
  });

  test("keeps the causal graph inspectable on a small screen", async ({ context, page, isMobile }) => {
    test.skip(!isMobile, "The narrow-layout graph journey is covered on mobile Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/repo-rate", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Calculate my impact" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Trace the result from policy decision to personal cash flow",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Deposit income, Household node, -₹4,000.00/ })
      .click();
    await expect(
      page.getByTestId("causal-inspector").getByRole("heading", { name: "Deposit income" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
