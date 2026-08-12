import { expect, test, type Page } from "@playwright/test";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23666'/%3E%3C/svg%3E";
const WEB_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23999'/%3E%3C/svg%3E";

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

  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: null, source: null, options: [] }),
    });
  });

  await page.route("**/api/web-covers?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [{
          url: WEB_COVER_URL,
          thumbnailUrl: WEB_COVER_URL,
          source: "Brave Search",
          title: "Fourth Wing alternate cover",
          pageUrl: "https://example.com/fourth-wing",
          publisher: "Example",
        }],
      }),
    });
  });
});

async function openFourthWing(page: Page) {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Shelf of Fame" })).toBeVisible();
  await expect(page.locator("button.book")).toHaveCount(12);

  await page.getByPlaceholder("Search title or author…").fill("Fourth Wing");
  await expect(page.locator("button.book")).toHaveCount(1);

  const spine = page.locator('button.book[title="Fourth Wing — Rebecca Yarros"]');
  await expect(spine).toBeVisible();
  await spine.click();
  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();

  return spine;
}

test("loads the shelf, searches, opens a book, and preserves a rejected cover", async ({ page }) => {
  const spine = await openFourthWing(page);

  const correctCover = page.getByTitle("Save this as the correct cover");
  const wrongCover = page.getByRole("button", { name: "Not this one" });
  await expect(correctCover).toBeEnabled();
  await expect(wrongCover).toBeEnabled();

  await wrongCover.click();
  await expect(page.locator('.toast[role="status"]')).toContainText("Rejected that cover for Fourth Wing");
  await expect(page.locator(".cover-undo-toast")).toContainText("Cover rejected. Accident?");
  await expect(correctCover).toBeDisabled();

  await page.getByRole("button", { name: "Close" }).click();
  await spine.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  await expect(page.getByTitle("Save this as the correct cover")).toBeDisabled();
});

test("book modal owns reader controls and can undo a cover rejection without reload", async ({ page }) => {
  await openFourthWing(page);

  const modal = page.getByRole("dialog", { name: "Fourth Wing" });
  await expect(modal.getByText("YOUR BOOK", { exact: true })).toBeVisible();
  await expect(modal.getByRole("button", { name: /Customize spine/ })).toBeVisible();
  await expect(modal.getByRole("button", { name: /Change cover/ })).toBeVisible();

  const moreInfo = modal.getByRole("button", { name: "More book info" });
  const isbnRow = modal.locator(".details dt").filter({ hasText: /^ISBN$/ }).first();
  await expect(isbnRow).toBeHidden();
  await moreInfo.click();
  await expect(isbnRow).toBeVisible();
  await expect(modal.getByRole("button", { name: "Hide book info" })).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & { __coverUndoMarker?: string }).__coverUndoMarker = "alive";
  });

  const correctCover = page.getByTitle("Save this as the correct cover");
  await modal.getByRole("button", { name: "Not this one" }).click();
  await expect(correctCover).toBeDisabled();

  const undoToast = page.locator(".cover-undo-toast");
  await expect(undoToast).toContainText("Cover rejected. Accident?");
  await undoToast.getByRole("button", { name: "Undo" }).click();

  await expect(page.locator('.toast[role="status"]')).toContainText("Restored the previous cover choice for Fourth Wing");
  await expect(correctCover).toBeEnabled();
  await expect(page.locator(".cover-undo-toast")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __coverUndoMarker?: string }).__coverUndoMarker)).toBe("alive");
});

test("reset cover choices clears the saved decision without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  const modal = page.getByRole("dialog", { name: "Fourth Wing" });
  const correctCover = page.getByTitle("Save this as the correct cover");
  const resetCover = page.getByTitle("Clear this book's saved cover choice and rejected-cover history");

  await correctCover.click();
  await expect(page.locator('.toast[role="status"]')).toContainText("Marked this Google Books cover as correct for Fourth Wing");
  await expect(resetCover).toBeEnabled();

  await page.evaluate(() => {
    (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker = "alive";
  });

  await resetCover.click();
  await expect(page.locator('.toast[role="status"]')).toContainText("Reset cover choices for Fourth Wing");
  await expect(resetCover).toBeDisabled();
  await expect(modal).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker)).toBe("alive");
});

test("saved cover choices are managed by React without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  const modal = page.getByRole("dialog", { name: "Fourth Wing" });
  const correctCover = page.getByTitle("Save this as the correct cover");
  await correctCover.click();

  const savedCovers = modal.getByRole("region", { name: "Saved covers" });
  await expect(savedCovers).toBeVisible();
  await expect(savedCovers.getByRole("button", { name: "Currently on your shelf" })).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & { __savedCoverMarker?: string }).__savedCoverMarker = "alive";
  });

  await savedCovers.getByRole("button", { name: "Remove Google Books cover" }).click();
  await expect(page.locator('.toast[role="status"]')).toContainText("Removed that saved cover for Fourth Wing");
  await expect(modal.getByRole("region", { name: "Saved covers" })).toHaveCount(0);
  await expect(correctCover).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __savedCoverMarker?: string }).__savedCoverMarker)).toBe("alive");
});

test("web cover search applies and saves a cover without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  const modal = page.getByRole("dialog", { name: "Fourth Wing" });
  const webPanel = modal.getByRole("region", { name: "Browse web covers" });

  await page.evaluate(() => {
    (window as typeof window & { __webCoverMarker?: string }).__webCoverMarker = "alive";
  });

  await webPanel.getByRole("button", { name: "Web covers" }).click();
  const webResult = webPanel.getByRole("button", { name: "Use web image 1 on the shelf" });
  await expect(webResult).toBeVisible();
  await webResult.click();

  await expect(page.locator('.toast[role="status"]')).toContainText("Applied a web cover to Fourth Wing");
  await expect(modal.getByRole("region", { name: "Saved covers" })).toBeVisible();
  await expect(page.getByTitle("Save this as the correct cover")).toBeEnabled();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __webCoverMarker?: string }).__webCoverMarker)).toBe("alive");
});
