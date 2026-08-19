import { expect, Page, test } from "@playwright/test";
import { searchShelf, shelfBook } from "./mobile-shelf-helpers";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23567'/%3E%3C/svg%3E";
const SECOND_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23765'/%3E%3C/svg%3E";
const WEB_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23987'/%3E%3C/svg%3E";

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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: null, source: null }),
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
          title: "Fourth Wing alternate cover",
          publisher: "Example",
          pageUrl: "https://example.com/fourth-wing",
        }],
      }),
    });
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
  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  await expect(page.getByTitle("Save this as the correct cover")).toBeEnabled();
}

async function revealSecondCover(page: Page) {
  const secondCover = page.getByRole("button", { name: "Use this OL cover on the shelf" });
  await expect(secondCover).toBeVisible({ timeout: 12_000 });
  return secondCover;
}

async function rejectedCoverIsPersisted(page: Page) {
  return page.evaluate((rejectedUrl) => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      coverFeedback?: { rejected?: string[] };
    }>;
    const book = books.find((item) => item.title === "Fourth Wing");
    return Boolean(book?.coverFeedback?.rejected?.includes(rejectedUrl));
  }, COVER_URL);
}

test("loads the shelf, searches, opens a book, and preserves a rejected cover", async ({ page }) => {
  await openFourthWing(page);

  const modal = page.getByRole("dialog", { name: "Fourth Wing" });
  await modal.getByRole("button", { name: "Not this one" }).click();

  await expect(page.locator(".cover-undo-toast")).toContainText("Cover rejected. Accident?");
  await expect.poll(() => rejectedCoverIsPersisted(page)).toBe(true);

  await page.getByRole("button", { name: "Close" }).click();
  const spine = shelfBook(page, "Fourth Wing", "Rebecca Yarros");
  await spine.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  await expect.poll(() => rejectedCoverIsPersisted(page)).toBe(true);
  await expect.poll(async () => page.evaluate((rejectedUrl) => {
    const image = document.querySelector<HTMLImageElement>(".modal .cover-image");
    return !image || image.getAttribute("src") !== rejectedUrl;
  }, COVER_URL)).toBe(true);
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

  await modal.getByRole("button", { name: "Not this one" }).click();
  await expect.poll(() => rejectedCoverIsPersisted(page)).toBe(true);

  const undoToast = page.locator(".cover-undo-toast");
  await expect(undoToast).toContainText("Cover rejected. Accident?");
  await undoToast.getByRole("button", { name: "Undo", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("Restored the previous cover choice for Fourth Wing");
  await expect.poll(() => rejectedCoverIsPersisted(page)).toBe(false);
  await expect(page.locator(".cover-undo-toast")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __coverUndoMarker?: string }).__coverUndoMarker)).toBe("alive");
});

test("reset cover choices clears the saved decision without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  const correctCover = page.getByTitle("Save this as the correct cover");
  const resetCover = page.getByTitle("Clear this book's saved cover choice and rejected-cover history");

  await correctCover.click();
  await expect(resetCover).toBeEnabled();

  await page.evaluate(() => {
    (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker = "alive";
  });
  await resetCover.click();

  await expect(resetCover).toBeDisabled();
  await expect.poll(() => page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      preferredCover?: unknown;
      coverFeedback?: unknown;
    }>;
    const book = books.find((item) => item.title === "Fourth Wing");
    return Boolean(book && !book.preferredCover && !book.coverFeedback);
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __coverResetMarker?: string }).__coverResetMarker)).toBe("alive");
});

test("saved cover choices are managed by React without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  await page.getByTitle("Save this as the correct cover").click();
  const secondCover = await revealSecondCover(page);
  await page.evaluate(() => {
    (window as typeof window & { __savedCoverMarker?: string }).__savedCoverMarker = "alive";
  });
  await secondCover.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __savedCoverMarker?: string }).__savedCoverMarker)).toBe("alive");

  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();
  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();

  const savedOption = page.getByRole("button", { name: "Use saved Google Books cover" });
  await expect(savedOption).toBeVisible();
  await savedOption.click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __savedCoverMarker?: string }).__savedCoverMarker)).toBe("alive");

  const removeSaved = page.getByRole("button", { name: "Remove Open Library cover" });
  await expect(removeSaved).toBeVisible();
  await removeSaved.click();
  await expect(page.getByRole("button", { name: "Remove Open Library cover" })).toHaveCount(0);
});

test("web cover search applies and saves a cover without reloading the page", async ({ page }) => {
  await openFourthWing(page);

  await page.evaluate(() => {
    (window as typeof window & { __webCoverMarker?: string }).__webCoverMarker = "alive";
  });

  await page.getByRole("button", { name: "Alternate editions" }).click();
  const webResult = page.getByRole("button", { name: "Use web image 1 on the shelf" });
  await expect(webResult).toBeVisible();
  await webResult.click();

  await expect(page.getByText("✓ Applied to your shelf and saved with this book.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __webCoverMarker?: string }).__webCoverMarker)).toBe("alive");
  await expect.poll(async () => page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      preferredCover?: { url?: string };
    }>;
    return books.find((book) => book.title === "Fourth Wing")?.preferredCover?.url || "";
  })).toBe(WEB_COVER_URL);
});

test("adding a searched book updates the live shelf without reloading the page", async ({ page }) => {
  await mockCoverApis(page);
  await page.goto("/");
  await page.evaluate(() => {
    (window as typeof window & { __addBookMarker?: string }).__addBookMarker = "alive";
  });

  await page.getByRole("button", { name: "Add Book", exact: true }).click();
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

test("a single database-cover tap saves the cover and returns to the shelf", async ({ page }) => {
  await openFourthWing(page);

  const secondCover = await revealSecondCover(page);

  await page.evaluate(() => {
    (window as typeof window & { __singleTapMarker?: string }).__singleTapMarker = "alive";
  });
  await secondCover.click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toHaveCount(0);
  await expect(shelfBook(page, "Fourth Wing", "Rebecca Yarros")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __singleTapMarker?: string }).__singleTapMarker)).toBe("alive");
  await expect.poll(async () => page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      preferredCover?: { url?: string };
    }>;
    return books.find((book) => book.title === "Fourth Wing")?.preferredCover?.url || "";
  })).toBe(SECOND_COVER_URL);
});
