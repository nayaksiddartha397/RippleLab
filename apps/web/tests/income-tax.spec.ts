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
  updatedAt: "2026-08-19T08:00:00.000Z",
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
      value: encode({ email: "income.tax@example.com" }),
    },
    {
      domain: "localhost",
      name: "ripplelab-test-profile",
      path: "/",
      value: encode(seededProfile),
    },
  ]);
}

test.describe("personal income-tax engine", () => {
  test("requires authentication", async ({ page }) => {
    await page.goto("/scenarios/income-tax", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fscenarios%2Fincome-tax/);
  });

  test("compares current and proposed slabs with a personal take-home effect", async ({
    context,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "The complete income-tax lifecycle is covered once on desktop Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/income-tax", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle("Income-tax simulator | RippleLab");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Compare AY 2026-27 income tax with an editable marginal-rate change and see the personal take-home effect.",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Income-tax simulator | RippleLab",
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      "Income-tax simulator | RippleLab",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "See how a marginal-rate change reaches your take-home pay.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Annual salary (₹)")).toHaveValue("2160000");
    await expect(page.getByLabel("Standard deduction (₹)")).toHaveValue("75000");
    await page.getByRole("button", { name: "Calculate income-tax impact" }).click();

    await expect(
      page.locator(".repo-net-result").getByText("₹35,048.00", { exact: true }),
    ).toBeVisible();
    const outputs = page.getByLabel("Income-tax outputs");
    await expect(outputs.getByText("₹20,85,000.00", { exact: true })).toBeVisible();
    await expect(outputs.getByText("₹2,30,100.00", { exact: true })).toBeVisible();
    await expect(outputs.getByText("₹1,95,052.00", { exact: true })).toBeVisible();
    await expect(outputs.getByText("₹2,920.67", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "₹8,000.00" }).first()).toBeVisible();
    await expect(page.getByText(/no LLM calculates money/)).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Trace income through current tax, proposed tax and take-home pay",
      }),
    ).toBeVisible();

    const inspector = page.getByTestId("causal-inspector");
    await page
      .getByRole("button", {
        name: /Proposed total income tax, Financial product node, ₹1,95,052.00 \/ year/,
      })
      .click();
    await expect(
      inspector.getByRole("heading", { name: "Proposed total income tax" }),
    ).toBeVisible();
    await expect(inspector.getByText("tax.ay2026_27_new_regime.v1")).toBeVisible();
    await expect(inspector.getByText("Health and Education Cess", { exact: true })).toBeVisible();
    await expect(
      inspector.getByRole("link", { name: "Salaried Individuals for AY 2026-27" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);

    await page.getByLabel("Rate change (percentage points)").fill("-1");
    await page.getByRole("button", { name: "Calculate income-tax impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("₹17,524.00", { exact: true }),
    ).toBeVisible();
  });

  test("compares a higher-income rate increase on a small screen", async ({
    context,
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "The narrow-layout income-tax journey is covered on mobile Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/income-tax", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /₹30 lakh salary/ }).click();
    await page.getByRole("button", { name: /2pp increase/ }).click();
    await expect(page.getByLabel("Annual salary (₹)")).toHaveValue("3000000");
    await page.getByRole("button", { name: "Calculate income-tax impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("-₹52,520.00", { exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Monthly take-home impact, Outcome node, -₹4,376.67/ })
      .click();
    await expect(
      page
        .getByTestId("causal-inspector")
        .getByRole("heading", { name: "Monthly take-home impact" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
