import { expect, test } from "@playwright/test";
import { shelfBook } from "./mobile-shelf-helpers";

const CLOUD_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23577'/%3E%3C/svg%3E";

test("hydrates a signed-in cloud shelf into React state without reloading", async ({ page }) => {
  await page.addInitScript(() => {
    const count = Number(window.sessionStorage.getItem("cloud-test-load-count") || "0") + 1;
    window.sessionStorage.setItem("cloud-test-load-count", String(count));
    window.localStorage.setItem("shelf-of-fame-supabase-session", JSON.stringify({
      access_token: "test-cloud-token",
      user: { id: "user-1", email: "reader@example.com" },
    }));
  });

  await page.route("**/rest/v1/rpc/get_my_shelf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        books: [{
          id: "cloud-book-1",
          title: "Cloud Reader Book",
          author: "Shelf Author",
          color: "#445566",
          isbn: "9781234567897",
          preferredCover: { url: CLOUD_COVER, source: "Cloud saved" },
          favorite: true,
        }],
        settings: {
          theme: "classic",
          spine_labels: false,
          title_orientation: "sideways",
          decor_owned: [],
          decor_active: {},
          community_stars: 3,
          shelf_public: false,
        },
      }),
    });
  });
  await page.route("**/rest/v1/rpc/get_approved_covers_for_library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/rpc/sync_my_shelf", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ books: [], settings: { shelf_public: false } }),
  }));
  await page.route("**/api/cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null, options: [] }) });
  });
  await page.route("**/api/romance-cover?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null, source: null }) });
  });

  await page.goto("/");

  const cloudBook = shelfBook(page, "Cloud Reader Book", "Shelf Author");
  await expect(cloudBook).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button[data-book-id]')).toHaveCount(1);
  await expect(page.getByText("Saved to cloud", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Personalize your shelf" }).click();
  const personalization = page.getByRole("dialog", { name: "Personalize your shelf" });
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("shelf-of-fame-spine-labels-v1"))).toBe("off");
  await expect(personalization.getByRole("button", { name: /Spine text/ })).toHaveAttribute("aria-pressed", "false");
  await expect(personalization.getByRole("button", { name: "Sideways" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-title-orientation", "sideways");
  await personalization.getByRole("button", { name: "Close theme picker" }).click();
  await cloudBook.click();
  await expect(page.getByAltText("Cover of Cloud Reader Book")).toHaveAttribute("src", CLOUD_COVER);

  const state = await page.evaluate(() => ({
    library: JSON.parse(window.localStorage.getItem("shelf-of-fame-library-v1") || "[]") as Array<{ id?: string; title?: string }>,
    favorites: JSON.parse(window.localStorage.getItem("shelf-of-fame-favorites-v1") || "[]") as string[],
    initialized: window.localStorage.getItem("shelf-of-fame-cloud-initialized-v1"),
    loadCount: window.sessionStorage.getItem("cloud-test-load-count"),
  }));

  expect(state.library).toHaveLength(1);
  expect(state.library[0]).toMatchObject({ id: "cloud-book-1", title: "Cloud Reader Book" });
  expect(state.favorites).toContain("cloud reader book::shelf author");
  expect(state.initialized).toBe("1");
  expect(state.loadCount).toBe("1");
});

test("retries a failed cloud write without losing the local shelf", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("shelf-of-fame-supabase-session", JSON.stringify({
      access_token: "test-cloud-token",
      user: { id: "user-1", email: "reader@example.com" },
    }));
    window.localStorage.setItem("shelf-of-fame-library-v1", JSON.stringify([{
      id: "local-book-1",
      title: "Offline First Book",
      author: "Patient Reader",
      color: "#445566",
    }]));
  });

  await page.route("**/rest/v1/rpc/get_my_shelf", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ books: [], settings: null }),
  }));

  let syncAttempts = 0;
  await page.route("**/rest/v1/rpc/sync_my_shelf", (route) => {
    syncAttempts += 1;
    if (syncAttempts === 1) {
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Temporary outage" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ books: [], settings: { shelf_public: false } }),
    });
  });
  await page.route("**/rest/v1/rpc/get_approved_covers_for_library", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "[]",
  }));

  await page.goto("/");

  await expect.poll(() => syncAttempts, { timeout: 8_000 }).toBe(2);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("shelf-of-fame-cloud-pending-v1"))).toBeNull();
  await expect(shelfBook(page, "Offline First Book", "Patient Reader")).toBeVisible();
  await expect(page.getByText("Saved to cloud", { exact: true })).toBeVisible();
});
