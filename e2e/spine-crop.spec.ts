import { expect, test } from "@playwright/test";
import { searchShelf, shelfBook } from "./mobile-shelf-helpers";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23456'/%3E%3C/svg%3E";

test("opens the shared spine selector without reloading", async ({ page }) => {
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: COVER_URL, source: "Google Books", options: [{ url: COVER_URL, source: "Google Books" }] }),
    });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null }) });
  });
  await page.route("**/rest/v1/spines?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/");
  await searchShelf(page, "Fourth Wing");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();

  const dialog = page.getByRole("dialog", { name: "Fourth Wing" });
  await expect(dialog).toBeVisible();
  await dialog.getByText("Customize artwork", { exact: true }).click();
  await dialog.getByRole("button", { name: "Spine Selector" }).click();

  await expect(dialog.getByRole("region", { name: "Choose a spine" })).toBeVisible();
  await expect(dialog.getByText("Active", { exact: true })).toBeVisible();
  await expect(dialog.getByText("No custom curator spines have been published for this book yet.")).toBeVisible();
});
