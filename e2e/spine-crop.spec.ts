import { expect, test } from "@playwright/test";

const COVER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'%3E%3Crect width='2' height='3' fill='%23456'/%3E%3C/svg%3E";

async function mockCoverApis(page: import("@playwright/test").Page) {
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
}

test("cover crop saves a spine and updates the live shelf without reloading", async ({ page }) => {
  await mockCoverApis(page);
  await page.goto("/");

  await page.getByPlaceholder("Search title or author…").fill("Fourth Wing");
  const book = page.locator('button.book[title="Fourth Wing — Rebecca Yarros"]');
  await book.click();

  const dialog = page.getByRole("dialog", { name: "Fourth Wing" });
  await expect(dialog).toBeVisible();
  const cropButton = dialog.getByRole("button", { name: /Choose cover crop/ });
  await expect(cropButton).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & { __spineCropMarker?: string }).__spineCropMarker = "alive";
  });

  await cropButton.click();
  const editor = dialog.getByRole("group", { name: "Choose a spine crop" });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute("data-position", "center");

  await editor.getByRole("button", { name: "Show next crop" }).click();
  await expect(editor).toHaveAttribute("data-position", "right");

  await editor.getByRole("button", { name: "Use this spine crop" }).click();
  await expect(editor).toHaveCount(0);
  await expect(dialog.locator(".generate-spine-status")).toContainText("Right detail saved for Fourth Wing");
  await expect(book).toHaveAttribute("data-spine-crop", "right");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __spineCropMarker?: string }).__spineCropMarker)).toBe("alive");

  const saved = await page.evaluate(async (coverUrl) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("shelf-of-fame-art", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ image?: string; mode?: string }>((resolve, reject) => {
        const tx = db.transaction("generated-spines", "readonly");
        const store = tx.objectStore("generated-spines");
        const imageRequest = store.get(coverUrl);
        const modeRequest = store.get(`mode:${coverUrl}`);
        tx.oncomplete = () => resolve({
          image: typeof imageRequest.result === "string" ? imageRequest.result : undefined,
          mode: typeof modeRequest.result === "string" ? modeRequest.result : undefined,
        });
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, COVER_URL);

  expect(saved.image).toContain("/api/spine?v=3&position=right");
  expect(saved.mode).toBe("overlay");
});
