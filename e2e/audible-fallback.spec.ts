import { expect, test } from "@playwright/test";
import { searchShelf, shelfBook } from "./mobile-shelf-helpers";

const AUDIBLE_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23886'/%3E%3C/svg%3E";

test("uses Audible only after database cover lookup finishes empty", async ({ page }) => {
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: null, source: null, options: [] }),
    });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: null, source: null }),
    });
  });
  await page.route("**/api/asin?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        asin: "B0BXQ4JQ2X",
        coverUrl: AUDIBLE_COVER_URL,
        coverSource: "Audible",
      }),
    });
  });

  await page.goto("/");
  await searchShelf(page, "Fourth Wing");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();

  await expect(page.getByRole("dialog", { name: "Fourth Wing" })).toBeVisible();
  await expect(page.getByAltText("Cover of Fourth Wing")).toHaveAttribute("src", AUDIBLE_COVER_URL);

  await expect.poll(async () => page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      asin?: string;
      preferredCover?: { source?: string };
    }>;
    const book = books.find((item) => item.title === "Fourth Wing");
    return `${book?.asin || ""}:${book?.preferredCover?.source || ""}`;
  })).toBe("B0BXQ4JQ2X:Audible");
});
