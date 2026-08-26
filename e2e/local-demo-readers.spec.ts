import { expect, test } from "@playwright/test";

test("shows five searchable local demo readers with public shelves", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/readers");

  for (const name of ["Malachi Vize", "Kade Mitchell", "Jagger Thatcher", "Nikolai Sokolov", "Emmett Montgomery"]) {
    await expect(page.getByRole("strong").filter({ hasText: name })).toBeVisible();
  }

  await page.getByPlaceholder("Try a name, @username, or genre").fill("nik");
  await expect(page.getByRole("strong").filter({ hasText: "Nikolai Sokolov" })).toBeVisible();
  await expect(page.getByRole("strong").filter({ hasText: "Malachi Vize" })).toHaveCount(0);

  await page.getByRole("strong").filter({ hasText: "Nikolai Sokolov" }).click();
  await expect(page).toHaveURL(/\/u\/nikolaisokolov$/);
  await expect(page.getByRole("heading", { name: "Nikolai Sokolov’s shelf" })).toBeVisible();
  await expect(page.locator(".public-favorites .public-shared-spine")).toHaveCount(5);
  await expect(page.locator(".public-favorites .public-book-copy")).toHaveCount(0);
  const favoriteLayout = await page.locator(".public-favorites-list").evaluate((container) => {
    const spines = [...container.querySelectorAll<HTMLElement>(".public-shared-spine")];
    const boxes = spines.map((spine) => spine.getBoundingClientRect());
    return {
      clipped: container.scrollWidth > container.clientWidth + 1,
      overlap: boxes.some((box, index) => index > 0 && box.left < boxes[index - 1].right),
    };
  });
  expect(favoriteLayout).toEqual({ clipped: false, overlap: false });
});

test("keeps local demo follows in the browser without requiring sign in", async ({ page }) => {
  await page.goto("/u/malachivize");
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(page.getByRole("button", { name: "✓ Following" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "✓ Following" })).toBeVisible();
});

test("keeps every local demo shelf public and viewable", async ({ page }) => {
  const readers = [
    ["malachivize", "Malachi Vize"],
    ["kademitchell", "Kade Mitchell"],
    ["jaggerthatcher", "Jagger Thatcher"],
    ["nikolaisokolov", "Nikolai Sokolov"],
    ["emmettmontgomery", "Emmett Montgomery"],
  ] as const;

  for (const [username, name] of readers) {
    await page.goto(`/u/${username}`);
    await expect(page.getByRole("heading", { name: `${name}’s shelf` })).toBeVisible();
    await expect(page.getByText("This shelf isn’t public")).toHaveCount(0);
    await expect(page.locator(".public-favorites .public-shared-spine")).toHaveCount(5);
  }
});

test("renders every demo reader's complete app-prompt custom shelf on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const username of ["malachivize", "kademitchell", "jaggerthatcher", "nikolaisokolov", "emmettmontgomery"]) {
    await page.goto(`/u/${username}`);
    const customSpines = page.locator('.public-favorites img[data-shelf-generated-spine="true"]');
    await expect(customSpines).toHaveCount(5);
    await expect.poll(async () => customSpines.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(page.locator(".public-favorites .generated-spine-title")).toHaveCount(0);
    const favoriteLayout = await page.locator(".public-favorites-list").evaluate((container) => {
      const spines = [...container.querySelectorAll<HTMLElement>(".public-shared-spine")];
      const boxes = spines.map((spine) => spine.getBoundingClientRect());
      return {
        clipped: container.scrollWidth > container.clientWidth + 1,
        overlap: boxes.some((box, index) => index > 0 && box.left < boxes[index - 1].right),
      };
    });
    expect(favoriteLayout).toEqual({ clipped: false, overlap: false });
    const shelfSpines = page.locator('.public-bookcase img[data-shelf-generated-spine="true"]');
    await expect(shelfSpines).toHaveCount(8);
    await expect.poll(async () => shelfSpines.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  }
});
