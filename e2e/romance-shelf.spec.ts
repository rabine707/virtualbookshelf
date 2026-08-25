import { expect, test } from "@playwright/test";
import { shelfBook } from "./mobile-shelf-helpers";

const ROMANCE_COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23964'/%3E%3C/svg%3E";

test("fills a missing shelf cover from Romance.io without DOM injection", async ({ page }) => {
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: null, source: null, options: [] }),
    });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    const url = new URL(route.request().url());
    const title = url.searchParams.get("title");
    const payload = title === "Fourth Wing"
      ? {
          url: ROMANCE_COVER_URL,
          source: "Romance.io",
          discoveredRomanceioId: "romance-fourth-wing",
        }
      : { url: null, source: null };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();
  await expect(page.getByAltText("Cover of Fourth Wing")).toHaveAttribute("src", ROMANCE_COVER_URL, { timeout: 8000 });

  await expect.poll(async () => page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      romanceioId?: string;
      romanceioCoverUrl?: string;
      preferredCover?: { source?: string };
    }>;
    const book = books.find((item) => item.title === "Fourth Wing");
    return `${book?.romanceioId || ""}:${book?.preferredCover?.source || ""}`;
  })).toBe("romance-fourth-wing:Romance.io");
});
