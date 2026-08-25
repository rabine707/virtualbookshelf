import { expect, test } from "@playwright/test";

const SESSION_KEY = "shelf-of-fame-supabase-session";

test("shows notifications, paginated followed-reader activity, and private-by-default controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key }) => window.localStorage.setItem(key, JSON.stringify({ access_token: "activity-token", user: { id: "reader-me" } })), { key: SESSION_KEY });
  await page.route("**/rest/v1/rpc/discover_public_profiles", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profiles: [], next_offset: null }) }));
  await page.route("**/rest/v1/rpc/get_reader_activity_feed", async (route) => {
    const body = route.request().postDataJSON() as { p_offset?: number };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        events: body.p_offset ? [{ id: 3, event_type: "favorited", created_at: new Date().toISOString(), username: "avery", display_name: "Avery", book_title: "Third Book", book_author: "Author" }] : [
          { id: 1, event_type: "finished", created_at: new Date().toISOString(), username: "avery", display_name: "Avery", book_title: "First Book", book_author: "Author" },
          { id: 2, event_type: "rated", rating: 5, created_at: new Date().toISOString(), username: "rowan", display_name: "Rowan", book_title: "Second Book", book_author: "Writer" },
        ],
        next_offset: body.p_offset ? null : 20,
        unread_activity: 2,
        new_followers: 1,
        preferences: { shelf_public: false, activity_sharing_enabled: false, activity_share_added: true, activity_share_finished: true, activity_share_rated: true, activity_share_favorited: true },
      }),
    });
  });
  await page.route("**/rest/v1/rpc/mark_reader_notifications_seen", (route) => route.fulfill({ status: 204 }));
  await page.route("**/rest/v1/rpc/update_activity_privacy", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ shelf_public: false, activity_sharing_enabled: true, activity_share_added: true, activity_share_finished: true, activity_share_rated: true, activity_share_favorited: true }) }));

  await page.goto("/readers");
  await expect(page.getByLabel("3 new updates")).toBeVisible();
  await page.getByRole("button", { name: /Activity/ }).click();
  await expect(page.getByText("1 new reader follows you.")).toBeVisible();
  await expect(page.getByText(/Avery finished/)).toBeVisible();
  await expect(page.getByText(/Rowan rated 5 ★/)).toBeVisible();
  await expect(page.getByText("Your shelf is private, so no activity is visible.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Share my reading activity/ }).check();
  await expect(page.getByText("On · shelf private")).toBeVisible();
  await page.getByRole("button", { name: "Show older activity" }).click();
  await expect(page.getByText(/Avery favorited/)).toBeVisible();
});
