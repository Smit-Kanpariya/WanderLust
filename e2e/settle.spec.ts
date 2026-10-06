import { expect, test } from "@playwright/test";

test("settles a group end to end and copies the plan", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settle group expenses with fewer transfers.");

  // Start from a blank group and enter the product example.
  await page.getByRole("button", { name: "Clear example" }).click();
  await page.getByLabel("Name of person 1").fill("Alex");
  await page.getByLabel("Paid by Alex").fill("120");
  await page.getByLabel("Name of person 2").fill("Sam");
  await page.getByLabel("Paid by Sam").fill("30");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByLabel("Name of person 3")).toBeFocused();
  await page.getByLabel("Name of person 3").fill("Jordan");

  await expect(page.getByText("Ready. Balances add up to exactly $0.00.")).toBeVisible();
  await page.getByRole("button", { name: "Optimize settlements" }).click();

  const results = page.getByRole("region", { name: "Optimized settlement" });
  await expect(results.getByText("2 transfers", { exact: true })).toBeVisible();
  const transfers = results.getByRole("list", { name: "Transfers" }).getByRole("listitem");
  await expect(transfers).toHaveCount(2);
  await expect(transfers.nth(0)).toContainText("Jordan");
  await expect(transfers.nth(0)).toContainText("Alex");
  await expect(transfers.nth(0)).toContainText("$50.00");
  await expect(transfers.nth(1)).toContainText("Sam");
  await expect(transfers.nth(1)).toContainText("$20.00");

  await expect(results.getByText("All balances settled", { exact: true })).toBeVisible();
  const finals = results.getByRole("list", { name: "Final balances" }).getByRole("listitem");
  await expect(finals).toHaveCount(3);
  for (const item of await finals.all()) {
    await expect(item).toContainText("$0.00");
    await expect(item).toContainText("Settled ✓");
  }

  await results.getByRole("button", { name: "Copy plan" }).click();
  await expect(page.getByText("Settlement plan copied to clipboard.")).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(
    "Group settlement\n\nJordan → Alex: $50.00\nSam → Alex: $20.00\n\n2 transactions\nAll balances settled.",
  );

  // Editing marks the plan as outdated until it is recalculated.
  await page.getByLabel("Paid by Sam").fill("40");
  await expect(results.getByText("You've edited the group since this plan was made.")).toBeVisible();
  await results.getByRole("button", { name: "Recalculate" }).click();
  await expect(results.getByText("2 transfers", { exact: true })).toBeVisible();
});

test("shows inline validation instead of alerts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clear example" }).click();
  await page.getByLabel("Paid by person 1").fill("12.345");
  await page.getByRole("button", { name: "Optimize settlements" }).click();
  await expect(page.getByText("Use at most 2 decimal places")).toBeVisible();
  await expect(page.getByText("Enter a name").first()).toBeVisible();
  await expect(page.getByText("Fix the 3 highlighted fields to continue.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Optimized settlement" })).toHaveCount(0);
});

test("custom split requires shares to match payments", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Custom split").click();
  await expect(page.getByLabel("Fair share for Ava")).toHaveValue("50.00");
  await page.getByLabel("Fair share for Ava").fill("40");
  await expect(page.getByText("$10.00 left to assign")).toBeVisible();
  await page.getByRole("button", { name: "Optimize settlements" }).click();
  await expect(page.getByText("Fair shares are $10.00 short of the $200.00 paid.")).toBeVisible();
  await page.getByLabel("Fair share for Ava").fill("50");
  await page.getByRole("button", { name: "Optimize settlements" }).click();
  await expect(page.getByRole("region", { name: "Optimized settlement" }).getByText("3 transfers")).toBeVisible();
});

test("has no horizontal overflow on a 360px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByRole("button", { name: "Optimize settlements" }).click();
  await expect(page.getByRole("region", { name: "Optimized settlement" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
