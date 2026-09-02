import { expect, Page, test } from "@playwright/test";
import { searchShelf, shelfBook } from "./mobile-shelf-helpers";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23567'/%3E%3C/svg%3E";
const SECOND_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23765'/%3E%3C/svg%3E";

async function mockCoverApis(page: Page) {
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: COVER_URL,
        source: "Google Books",
        options: [
          { url: COVER_URL, source: "Google Books" },
          { url: SECOND_COVER_URL, source: "Open Library" },
        ],
      }),
    });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null }) });
  });
  await page.route("**/api/book-search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [{
          id: "test-book",
          title: "A Test Book",
          author: "Test Author",
          year: 2026,
          isbn: "9781234567897",
          coverUrl: SECOND_COVER_URL,
          source: "Google Books",
        }],
      }),
    });
  });
}

async function openFourthWing(page: Page) {
  await mockCoverApis(page);
  await page.goto("/");
  await searchShelf(page, "Fourth Wing");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();
  const dialog = page.getByRole("dialog", { name: "Fourth Wing" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByAltText("Cover of Fourth Wing")).toHaveAttribute("src", COVER_URL);
  return dialog;
}

async function openCoverSelector(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Fourth Wing" });
  await dialog.getByText("Customize artwork", { exact: true }).click();
  await dialog.getByRole("button", { name: "Cover Selector" }).click();
  await expect(dialog.getByRole("region", { name: "Choose a cover" })).toBeVisible();
  return dialog;
}

async function useCover(page: Page, accessibleName: string) {
  await page.getByRole("button", { name: accessibleName }).click();
  const crop = page.getByRole("dialog", { name: "Crop cover for Fourth Wing" });
  await expect(crop).toBeVisible();
  await crop.getByRole("button", { name: "Use image as-is" }).click();
}

async function preferredCover(page: Page) {
  return page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      preferredCover?: { url?: string };
    }>;
    return books.find((book) => book.title === "Fourth Wing")?.preferredCover?.url || "";
  });
}

test("loads the shelf, searches, and preserves a selected cover", async ({ page }) => {
  await openFourthWing(page);
  await openCoverSelector(page);
  await useCover(page, "Crop or use this OL cover");
  await expect.poll(() => preferredCover(page)).toBe(SECOND_COVER_URL);

  await page.getByRole("button", { name: "Back to book" }).click();
  await expect(page.getByAltText("Cover of Fourth Wing")).toHaveAttribute("src", SECOND_COVER_URL);
});

test("book modal exposes reader controls and collapsible editors without reloading", async ({ page }) => {
  const modal = await openFourthWing(page);
  await expect(modal.getByText("YOUR BOOK", { exact: true })).toBeVisible();
  await expect(modal.getByRole("region", { name: "Book personality" })).toBeVisible();
  await expect(modal.getByRole("region", { name: "Your reading memory" })).toBeVisible();
  await expect(modal.getByLabel("Reading status")).toBeVisible();

  await modal.getByText("Customize artwork", { exact: true }).click();
  await expect(modal.getByRole("button", { name: "Cover Selector" })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Spine Selector" })).toBeVisible();
  await modal.getByText("Book information", { exact: true }).click();
  await expect(modal.getByRole("region", { name: "Edit book information" })).toBeVisible();
});

test("reset cover choices clears the saved decision without reloading", async ({ page }) => {
  await openFourthWing(page);
  await openCoverSelector(page);
  await useCover(page, "Crop or use this Google cover");

  const resetCover = page.getByTitle("Clear this book's saved cover choice and rejected-cover history");
  await expect(resetCover).toBeEnabled();
  await page.evaluate(() => { (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker = "alive"; });
  await resetCover.click();

  await expect(resetCover).toBeDisabled();
  await expect.poll(() => preferredCover(page)).toBe("");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker)).toBe("alive");
});

test("saved cover choices are managed by React without reloading", async ({ page }) => {
  await openFourthWing(page);
  await openCoverSelector(page);
  await useCover(page, "Crop or use this Google cover");
  await useCover(page, "Crop or use this OL cover");

  await expect.poll(() => preferredCover(page)).toBe(SECOND_COVER_URL);
  const removeSaved = page.getByRole("button", { name: "Remove Google Books cover from your saved covers" });
  await expect(removeSaved).toBeVisible();
  await removeSaved.click();
  await expect(removeSaved).toHaveCount(0);
});

test("adding a searched book updates the live shelf without reloading", async ({ page }) => {
  await mockCoverApis(page);
  await page.goto("/");
  await page.evaluate(() => { (window as typeof window & { __addBookMarker?: string }).__addBookMarker = "alive"; });

  await page.getByRole("button", { name: "Add a book", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add books" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Church").fill("A Test Book");
  await dialog.getByPlaceholder("Reuss").fill("Test Author");
  await dialog.getByRole("button", { name: "Search" }).click();

  const searchResult = dialog.locator(".book-search-result").filter({ hasText: "A Test Book" }).first();
  await expect(searchResult).toBeVisible();
  await searchResult.click();
  await expect(shelfBook(page, "A Test Book", "Test Author")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __addBookMarker?: string }).__addBookMarker)).toBe("alive");
});
