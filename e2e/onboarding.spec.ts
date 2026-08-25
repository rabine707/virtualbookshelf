import { expect, test } from "@playwright/test";

const STATUS_KEY = "shelf-of-fame-onboarding-status-v1";
const ELIGIBLE_KEY = "shelf-of-fame-onboarding-eligible-v1";
const LIBRARY_KEY = "shelf-of-fame-library-v1";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ keys }) => {
    if (window.sessionStorage.getItem("onboarding-test-ready") === "1") return;
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.setItem("onboarding-test-ready", "1");
  }, { keys: [STATUS_KEY, ELIGIBLE_KEY, LIBRARY_KEY] });
});

test("offers resumable first-run setup and respects permanent skipping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make this shelf yours" })).toBeVisible();
  await expect(page.getByText("You can stop and return at any time.")).toBeVisible();

  await page.getByRole("button", { name: "Start my shelf" }).click();
  await expect(page.getByLabel("Getting started")).toContainText("0 of 5 complete");
  await page.getByRole("button", { name: "Hide setup checklist" }).click();
  await expect(page.getByLabel("Getting started")).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel("Getting started")).toBeVisible();
  await expect(page.getByLabel("Getting started")).toContainText("Bring in your books");
  await page.getByRole("button", { name: "Skip the rest" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Make this shelf yours" })).toHaveCount(0);
  await expect(page.getByLabel("Getting started")).toHaveCount(0);
});

test("does not interrupt an established library", async ({ page }) => {
  await page.addInitScript(({ key }) => window.localStorage.setItem(key, JSON.stringify([{ id: "owned-1", title: "Owned Book", author: "Reader", color: "#654a38" }])), { key: LIBRARY_KEY });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make this shelf yours" })).toHaveCount(0);
  await expect(page.getByLabel("Getting started")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Owned Book by Reader" })).toBeVisible();
});
