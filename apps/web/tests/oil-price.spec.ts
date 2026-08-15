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
      value: encode({ email: "oil.price@example.com" }),
    },
    {
      domain: "localhost",
      name: "ripplelab-test-profile",
      path: "/",
      value: encode(seededProfile),
    },
  ]);
}

test.describe("personal oil-price engine", () => {
  test("requires authentication", async ({ page }) => {
    await page.goto("/scenarios/oil-price", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fscenarios%2Foil-price/);
  });

  test("separates crude, retail fuel and household channels", async ({ context, page, isMobile }) => {
    test.skip(isMobile, "The complete oil-price lifecycle is covered once on desktop Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/oil-price", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Translate a crude-oil shock into household expenses." }),
    ).toBeVisible();
    await expect(page.getByLabel("Monthly fuel use (litres)")).toHaveValue("40");
    await expect(page.getByLabel("Food and groceries (₹/month)")).toHaveValue("22000");
    await page.getByRole("button", { name: "Calculate oil-price impact" }).click();

    await expect(
      page.locator(".repo-net-result").getByText("-₹24,360.00", { exact: true }),
    ).toBeVisible();
    const outputs = page.getByLabel("Oil-price outputs");
    await expect(outputs.getByText("$120.00 / barrel", { exact: true })).toBeVisible();
    await expect(outputs.getByText("₹115.00 / litre", { exact: true })).toBeVisible();
    await expect(outputs.getByText("-₹7,200.00", { exact: true })).toBeVisible();
    await expect(outputs.getByText("-₹17,160.00", { exact: true })).toBeVisible();
    await expect(page.getByText(/no LLM calculates money/)).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Trace crude oil through direct and indirect household costs",
      }),
    ).toBeVisible();

    const inspector = page.getByTestId("causal-inspector");
    await page
      .getByRole("button", { name: /Modeled retail fuel price, Market node, ₹115.00 \/ litre/ })
      .click();
    await expect(inspector.getByRole("heading", { name: "Modeled retail fuel price" })).toBeVisible();
    await expect(inspector.getByText("oil.crude_to_retail.v1")).toBeVisible();
    await expect(inspector.getByText("Crude-to-retail pass-through")).toBeVisible();
    await expect(
      inspector.getByRole("link", { name: "Price Build Up of Petrol and Diesel" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);

    await page.getByLabel("Monthly fuel use (litres)").fill("5");
    await page.getByRole("button", { name: "Calculate oil-price impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("-₹18,060.00", { exact: true }),
    ).toBeVisible();
  });

  test("keeps presets and the causal graph usable on a small screen", async ({ context, page, isMobile }) => {
    test.skip(!isMobile, "The narrow-layout oil-price journey is covered on mobile Chromium.");
    await seedSignedInProfile(context);
    await page.goto("/scenarios/oil-price", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Low-driving/ }).click();
    await expect(page.getByLabel("Monthly fuel use (litres)")).toHaveValue("5");
    await expect(page.getByLabel("Transport services (₹/month)")).toHaveValue("3850");
    await page.getByRole("button", { name: "Calculate oil-price impact" }).click();
    await expect(
      page.locator(".repo-net-result").getByText("-₹12,912.00", { exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Annual household impact, Outcome node, -₹12,912.00/ })
      .click();
    await expect(
      page.getByTestId("causal-inspector").getByRole("heading", { name: "Annual household impact" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});
