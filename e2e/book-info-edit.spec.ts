import { expect, test } from "@playwright/test";
import { searchShelf, shelfBook } from "./mobile-shelf-helpers";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23668'/%3E%3C/svg%3E";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const count = Number(window.sessionStorage.getItem("metadata-test-load-count") || "0") + 1;
    window.sessionStorage.setItem("metadata-test-load-count", String(count));
    window.localStorage.setItem("shelf-of-fame-spine-candidates-v1", JSON.stringify([
      {
        id: "candidate-fourth-wing",
        title: "Fourth Wing",
        author: "Rebecca Yarros",
        spineImage: "data:image/png;base64,abc",
        source: "upload",
        createdAt: 1,
      },
      {
        id: "candidate-lights-out",
        title: "Lights Out",
        author: "Navessa Allen",
        spineImage: "data:image/png;base64,def",
        source: "upload",
        createdAt: 2,
      },
    ]));
  });

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
      body: JSON.stringify({ url: null, source: null }),
    });
  });
});

test("edits book metadata in place and migrates spine candidate identity without reloading", async ({ page }) => {
  await page.goto("/");
  await searchShelf(page, "Fourth Wing");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();

  const bookDialog = page.getByRole("dialog", { name: "Fourth Wing" });
  await expect(bookDialog).toBeVisible();
  const bookInfo = bookDialog.getByRole("region", { name: "Book information" });
  await bookInfo.getByRole("button", { name: "Edit", exact: true }).click();

  const editor = page.getByRole("dialog", { name: "Edit book details" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Title").fill("Fourth Wing Corrected");
  await editor.getByLabel("Author").fill("Rebecca Yarros");
  await editor.getByLabel("ISBN-10 or ISBN-13").fill("9781649374042");
  await editor.getByLabel("ASIN").fill("B0BXQ4JQ2X");
  await editor.getByRole("button", { name: "Save changes" }).click();

  await expect(editor).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Fourth Wing Corrected" })).toBeVisible();
  await expect(shelfBook(page, "Fourth Wing Corrected", "Rebecca Yarros")).toBeVisible();

  const stored = await page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      title?: string;
      isbn?: string;
      asin?: string;
      isbnSource?: string;
    }>;
    const candidates = JSON.parse(window.localStorage.getItem("shelf-of-fame-spine-candidates-v1") || "[]") as Array<{
      id?: string;
      title?: string;
      author?: string;
    }>;
    return {
      book: books.find((item) => item.title === "Fourth Wing Corrected"),
      fourthWingCandidate: candidates.find((item) => item.id === "candidate-fourth-wing"),
      lightsOutCandidate: candidates.find((item) => item.id === "candidate-lights-out"),
      loadCount: window.sessionStorage.getItem("metadata-test-load-count"),
    };
  });

  expect(stored.book).toMatchObject({
    title: "Fourth Wing Corrected",
    isbn: "9781649374042",
    asin: "B0BXQ4JQ2X",
    isbnSource: "Manual correction",
  });
  expect(stored.fourthWingCandidate).toMatchObject({
    title: "Fourth Wing Corrected",
    author: "Rebecca Yarros",
  });
  expect(stored.lightsOutCandidate).toMatchObject({
    title: "Lights Out",
    author: "Navessa Allen",
  });
  expect(stored.loadCount).toBe("1");
});
