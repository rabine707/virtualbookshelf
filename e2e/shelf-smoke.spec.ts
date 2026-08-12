import { expect, test } from "@playwright/test";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23666'/%3E%3C/svg%3E";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: COVER_URL,
        source: "Google Books",
        options: [{ url: COVER_URL, source: "Google Books" }],
      }),
    });
  });
});

test("loads the shelf, searches, opens a book, and preserves a rejected cover", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Shelf of Fame" })).toBeVisible();
  await expect(page.locator("button.book")).toHaveCount(12);

  await page.getByPlaceholder("Search title or author…").fill("Fourth Wing");
  await expect(page.locator("button.book")).toHaveCount(1);

  const spine = page.locator('button.book[title="Fourth Wing — Rebecca Yarros"]');
  await expect(spine).toBeVisible();
  await spine.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  const correctCover = page.getByTitle("Save this as the correct cover");
  const wrongCover = page.locator(".cover-column button.primary").filter({ hasText: "Wrong cover" });
  await expect(correctCover).toBeEnabled();
  await expect(wrongCover).toBeEnabled();

  await wrongCover.click();
  await expect(page.getByRole("status")).toContainText("Rejected that cover for Fourth Wing");
  await expect(correctCover).toBeDisabled();

  await page.getByRole("button", { name: "Close" }).click();
  await spine.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  await expect(page.getByTitle("Save this as the correct cover")).toBeDisabled();
});
