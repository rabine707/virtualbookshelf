import { expect, test } from "@playwright/test";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const COVER_JOB_KEY = "shelf-of-fame-imported-cover-job-v1";

test("guides an iPhone reader from Goodreads export to CSV import", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify([
      { id: "owned-1", title: "Owned Book", author: "Reader", color: "#654a38" },
    ]));
  }, { key: LIBRARY_KEY });

  await page.goto("/");
  await page.getByRole("button", { name: "Add a book" }).click();

  const guide = page.locator(".book-search-goodreads");
  await expect(page.getByText("Bring over your Goodreads library")).toBeVisible();
  await expect(page.getByText(/cannot export from its app.*Safari/i)).toBeVisible();

  const exportLink = page.getByRole("link", { name: /Get my Goodreads file/ });
  await expect(exportLink).toHaveAttribute("href", "https://www.goodreads.com/review/import");
  await expect(exportLink).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("button", { name: "2. Choose downloaded CSV" })).toBeVisible();

  const bounds = await guide.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
});

test("previews Goodreads changes before a safe confirmed import", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify([
      { id: "owned-1", title: "Owned Book", author: "Reader", color: "#654a38", readerNote: "Keep me" },
    ]));
  }, { key: LIBRARY_KEY });

  const csv = [
    "Title,Author,My Rating,Exclusive Shelf",
    "Owned Book,Reader,5,read",
    "New Book,New Author,4,to-read",
    "New Book,New Author,4,to-read",
    ",Missing Title,0,to-read",
  ].join("\n");

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Owned Book by Reader" })).toBeVisible();
  const input = page.locator('input[type="file"][accept=".csv,text/csv"]');
  await input.setInputFiles({ name: "goodreads_library_export.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });

  const dialog = page.getByRole("dialog", { name: "Check your Goodreads import" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Your shelf will not change until you confirm.")).toBeVisible();
  await expect(page.getByLabel("2 books found")).toBeVisible();
  await expect(page.getByLabel("1 new book")).toBeVisible();
  await expect(page.getByLabel("2 duplicates")).toBeVisible();
  await expect(page.getByLabel("1 unreadable row")).toBeVisible();
  await expect(dialog.getByText(/saved covers, spines, notes, and reactions will be kept/i)).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /All books/ })).toBeChecked();
  await expect.poll(() => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "[]").length, LIBRARY_KEY)).toBe(1);

  await dialog.getByRole("radio", { name: /Want to read/ }).check();
  await expect(dialog.getByText("Reviewing 1 of 2 books. The others will stay out of this import.")).toBeVisible();
  await expect(page.getByLabel("1 book found")).toBeVisible();
  await expect(page.getByLabel("1 new book")).toBeVisible();
  await expect(page.getByLabel("1 duplicate")).toBeVisible();

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);

  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "[]").length, LIBRARY_KEY)).toBe(1);

  await input.setInputFiles({ name: "goodreads_library_export.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("dialog", { name: "Check your Goodreads import" }).getByRole("radio", { name: /Want to read/ }).check();
  await page.getByRole("button", { name: "Import 1 new book" }).click();
  await expect(page.getByRole("dialog", { name: "Check your Goodreads import" })).toHaveCount(0);
  await expect(page.getByText("Added 1 new book. No duplicates were created. 2 rows were skipped. 1 book was left out by your shelf choice.")).toBeVisible();
  const undoButton = page.getByRole("button", { name: "Undo import" });
  await expect(undoButton).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const books = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{ title?: string; rating?: number; readerNote?: string }>;
    const owned = books.find((book) => book.title === "Owned Book");
    return {
      titles: books.map((book) => book.title),
      owned: owned ? { title: owned.title, rating: owned.rating ?? null, readerNote: owned.readerNote } : null,
    };
  }, LIBRARY_KEY)).toEqual({
    titles: ["Owned Book", "New Book"],
    owned: { title: "Owned Book", rating: null, readerNote: "Keep me" },
  });

  const undoBounds = await undoButton.locator("xpath=..").boundingBox();
  expect(undoBounds).not.toBeNull();
  expect(undoBounds!.x).toBeGreaterThanOrEqual(0);
  expect(undoBounds!.x + undoBounds!.width).toBeLessThanOrEqual(390);

  await undoButton.click();
  await expect(page.getByText("Goodreads import undone. Your previous shelf is back.")).toBeVisible();
  await expect(undoButton).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => {
    const books = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{ title?: string; rating?: number; readerNote?: string }>;
    const owned = books.find((book) => book.title === "Owned Book");
    return {
      titles: books.map((book) => book.title),
      owned: owned ? { rating: owned.rating ?? null, readerNote: owned.readerNote } : null,
    };
  }, LIBRARY_KEY)).toEqual({
    titles: ["Owned Book"],
    owned: { rating: null, readerNote: "Keep me" },
  });
});

test("finds imported covers with pause, resume, and uncertain-match review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key }) => {
    if (window.sessionStorage.getItem("imported-cover-test-ready") === "1") return;
    window.localStorage.setItem(key, JSON.stringify([
      {
        id: "owned-1",
        title: "Owned Book",
        author: "Reader",
        color: "#654a38",
        preferredCover: { url: "https://example.com/custom-owned.jpg", source: "Reader upload" },
      },
    ]));
    window.sessionStorage.setItem("imported-cover-test-ready", "1");
  }, { key: LIBRARY_KEY });
  await page.route("**/api/romance-cover?**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ options: [] }) }));
  await page.route("**/api/cover?**", async (route) => {
    const title = new URL(route.request().url()).searchParams.get("title");
    if (title === "Exact Book") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://example.com/exact.jpg",
          source: "Google Books",
          options: [{ url: "https://example.com/exact.jpg", source: "Google Books" }],
        }),
      });
      return;
    }
    if (title === "Ambiguous Book") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://example.com/ambiguous.jpg",
          source: "Open Library",
          options: [{ url: "https://example.com/ambiguous.jpg", source: "Open Library" }],
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ options: [] }) });
  });

  const csv = [
    "Title,Author,ISBN13,Exclusive Shelf",
    "Exact Book,Exact Author,9781649374042,read",
    "Ambiguous Book,Maybe Author,,read",
  ].join("\n");

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Owned Book by Reader" })).toBeVisible();
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
    name: "goodreads_library_export.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Import 2 new books" }).click();
  await page.getByRole("button", { name: "Find 2 covers" }).click();

  const progress = page.getByRole("region", { name: "Imported book cover progress" });
  await expect(progress).toBeVisible();
  await progress.getByRole("button", { name: "Pause" }).click();
  await expect(progress.getByText("Cover search paused")).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null")?.status, COVER_JOB_KEY)).toBe("paused");

  await page.reload();
  await expect(progress.getByText("Cover search paused")).toBeVisible();
  await progress.getByRole("button", { name: "Resume" }).click();
  await expect(progress.getByText("Cover search complete")).toBeVisible({ timeout: 8000 });
  await expect(progress.getByText("1 matched automatically · 1 need review")).toBeVisible();

  const bounds = await progress.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);

  await expect.poll(() => page.evaluate((key) => {
    const books = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{ title?: string; preferredCover?: { url?: string } }>;
    return {
      owned: books.find((book) => book.title === "Owned Book")?.preferredCover?.url,
      exact: books.find((book) => book.title === "Exact Book")?.preferredCover?.url,
      ambiguous: books.find((book) => book.title === "Ambiguous Book")?.preferredCover?.url || null,
    };
  }, LIBRARY_KEY)).toEqual({
    owned: "https://example.com/custom-owned.jpg",
    exact: "https://example.com/exact.jpg",
    ambiguous: null,
  });

  await progress.getByRole("button", { name: "Review 1 cover" }).click();
  await expect(page.getByRole("dialog", { name: "Find covers for Ambiguous Book" })).toBeVisible();
});
