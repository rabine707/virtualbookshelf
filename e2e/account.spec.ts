import { expect, test } from "@playwright/test";

const SESSION_KEY = "shelf-of-fame-supabase-session";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((sessionKey) => window.localStorage.removeItem(sessionKey), SESSION_KEY);
});

test("offers sign in and account creation from the mobile You destination", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel(/Display name/)).toBeVisible();
});

test("signs in, stores the enriched account, and revokes the current session on sign out", async ({ page }) => {
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "access-123",
        refresh_token: "refresh-456",
        user: {
          id: "reader-1",
          email: "reader@example.com",
          user_metadata: { username: "shelfreader", display_name: "Shelf Reader" },
        },
      }),
    });
  });
  await page.route("**/rest/v1/profiles?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        username: "shelfreader",
        display_name: "Shelf Reader",
        avatar_url: null,
        bio: null,
      }]),
    });
  });
  await page.route("**/rest/v1/rpc/get_my_shelf", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ books: [], settings: null }) });
  });
  await page.route("**/rest/v1/rpc/get_profile_social", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ followers: 12, following: 7, is_self: true }) });
  });
  await page.route("**/rest/v1/rpc/list_profile_connections", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profiles: [{ username: "bookfriend", display_name: "Book Friend", followers: 3, is_following: false }], next_offset: null }) });
  });
  let logoutCalled = false;
  await page.route("**/auth/v1/logout?scope=local", async (route) => {
    logoutCalled = true;
    await route.fulfill({ status: 204 });
  });

  await page.goto("/account");
  await page.getByLabel("Email").fill("reader@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Your reading life" })).toBeVisible();
  await expect(page.getByText("@shelfreader")).toBeVisible();
  await expect(page.getByText("Total books", { exact: true })).toBeVisible();
  await expect(page.getByText("Finished", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add a bio so readers know what you love →" }).click();
  await expect(page.getByLabel("Bio")).toBeFocused();
  await page.getByRole("button", { name: "Choose the books that feel most like you →" }).click();
  await expect(page.locator(".sof-book-picker")).toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "12 Followers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "7 Following" })).toBeVisible();
  await page.getByRole("button", { name: "12 Followers" }).click();
  await expect(page.getByRole("dialog", { name: "Followers" })).toBeVisible();
  await expect(page.getByText("Book Friend")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.poll(() => page.evaluate((key) => Boolean(window.localStorage.getItem(key)), SESSION_KEY)).toBe(true);

  await page.getByRole("button", { name: /^Account/ }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(logoutCalled).toBe(true);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY)).toBeNull();
});
