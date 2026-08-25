import { expect, test } from "@playwright/test";

test("renders a mobile public shelf with five shared favorite spines", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const spine = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='220'%3E%3Crect width='80' height='220' fill='%23664b3a'/%3E%3C/svg%3E";
  const books = Array.from({ length: 10 }, (_, index) => ({
    id: `book-${index + 1}`,
    title: `Public Book ${index + 1}`,
    author: "Shelf Author",
    color: "#654a38",
    preferredCover: { url: spine, source: "Reader choice" },
    spineStoragePath: `reader/book-${index + 1}.png`,
  }));

  await page.route("**/rest/v1/rpc/get_public_shelf", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      profile: { username: "publicreader", display_name: "Public Reader", bio: "Stories worth sharing." },
      settings: { theme: "classic", profile_favorite_book_ids: books.slice(0, 5).map((book) => book.id), profile_favorites_style: "spines" },
      books,
    }),
  }));
  await page.route("**/rest/v1/rpc/get_profile_social", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ followers: 12, following: 8, is_following: true, favorite_genres: ["Fantasy"] }),
  }));
  await page.route("**/storage/v1/object/public/spines/**", (route) => route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='220'><rect width='80' height='220' fill='#664b3a'/></svg>",
  }));

  await page.goto("/u/publicreader");

  await expect(page.getByRole("heading", { name: "Public Reader’s shelf" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Readers" })).toHaveAttribute("href", "/readers");
  await expect(page.getByRole("button", { name: "✓ Following" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Books that feel like me" })).toBeVisible();
  await expect(page.locator(".public-favorites .public-shared-spine")).toHaveCount(5);
  await expect(page.locator(".public-book-copy")).toHaveCount(0);
  await expect(page.locator(".public-shelf-row")).toHaveCount(2);
  await expect(page.locator(".public-shelf-page")).not.toHaveCSS("overflow-x", "scroll");
});

test("gives unavailable profiles a route back to reader discovery", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_shelf", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.route("**/rest/v1/rpc/get_profile_social", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/u/private-reader");
  await expect(page.getByRole("heading", { name: "This shelf isn’t public" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discover public readers" })).toHaveAttribute("href", "/readers");
});
