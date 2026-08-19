import { expect, test } from "@playwright/test";
import { searchShelf, shelfBook, shelfCover } from "./mobile-shelf-helpers";

const COMMUNITY_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23795'/%3E%3C/svg%3E";
const CHOSEN_COVER = "https://example.com/chosen-cover.svg";

test("applies an approved community cover to the live shelf without reloading", async ({ page }) => {
  await page.addInitScript(() => {
    const count = Number(window.sessionStorage.getItem("community-test-load-count") || "0") + 1;
    window.sessionStorage.setItem("community-test-load-count", String(count));
  });
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null, options: [] }) });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null }) });
  });
  await page.route("**/rest/v1/rpc/get_approved_covers_for_library", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ client_key: "1", image_url: COMMUNITY_COVER, source: "Verified", confidence: 8 }]),
    });
  });

  await page.goto("/");
  await expect(shelfCover(page, "Fourth Wing", "Rebecca Yarros")).toHaveAttribute("src", COMMUNITY_COVER, { timeout: 8000 });

  const state = await page.evaluate(() => {
    const books = JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{
      id?: string;
      preferredCover?: { source?: string; url?: string };
    }>;
    return {
      book: books.find((item) => item.id === "1"),
      loadCount: window.sessionStorage.getItem("community-test-load-count"),
    };
  });

  expect(state.book?.preferredCover).toEqual({
    url: COMMUNITY_COVER,
    source: "Community · Verified",
  });
  expect(state.loadCount).toBe("1");
});

test("submits a signed-in reader's chosen cover directly from the React action", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;

  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: CHOSEN_COVER,
        source: "Google Books",
        options: [{ url: CHOSEN_COVER, source: "Google Books" }],
      }),
    });
  });
  await page.route(CHOSEN_COVER, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: "<svg xmlns='http://www.w3.org/2000/svg' width='2' height='3'><rect width='2' height='3' fill='#678'/></svg>",
    });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null }) });
  });
  await page.route("**/rest/v1/rpc/get_approved_covers_for_library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/rpc/submit_user_cover_choice", async (route) => {
    submitted = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("shelf-of-fame-supabase-session", JSON.stringify({ access_token: "test-access-token" }));
  });
  await searchShelf(page, "Fourth Wing");
  await shelfBook(page, "Fourth Wing", "Rebecca Yarros").click();

  const correctCover = page.getByTitle("Save this as the correct cover");
  await expect(correctCover).toBeEnabled();
  await correctCover.click();

  await expect.poll(() => submitted).not.toBeNull();
  expect(submitted).toMatchObject({
    p_title: "Fourth Wing",
    p_author: "Rebecca Yarros",
    p_image_url: CHOSEN_COVER,
    p_source: "Google Books",
  });
});
