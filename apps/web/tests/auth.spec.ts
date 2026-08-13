import { expect, test } from "@playwright/test";

test.describe("authentication lifecycle", () => {
  test.skip(({ isMobile }) => isMobile, "Lifecycle is covered once on desktop Chromium.");

  test("anonymous routes, account lifecycle, recovery and sign-out", async ({ page }) => {
    const email = "test.user@example.com";
    const initialPassword = "RippleLab-Start-2026";
    const updatedPassword = "RippleLab-Updated-2026";

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard/);
    await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();

    await page.goto("/auth/sign-up", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(initialPassword);
    await page.getByLabel("Confirm password").fill(initialPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\?signedOut=1/);
    await expect(page.getByText("You have been signed out safely.")).toBeVisible();

    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill("incorrect-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

    await page.goto("/auth/recovery", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send recovery link" }).click();
    await expect(page.getByText(/If an account exists/)).toBeVisible();

    await page.goto("/auth/update-password", { waitUntil: "domcontentloaded" });
    await page.getByLabel("New password", { exact: true }).fill(updatedPassword);
    await page.getByLabel("Confirm new password").fill(updatedPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/dashboard\?password=updated/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(updatedPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
