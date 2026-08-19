import { Page } from "@playwright/test";

export function shelfBook(page: Page, title: string, author: string) {
  return page.getByRole("button", { name: `${title} by ${author}`, exact: true });
}

export async function searchShelf(page: Page, query: string) {
  const input = page.getByPlaceholder("Search your shelf");
  if (!(await input.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Search", exact: true }).click();
  }
  await input.fill(query);
  return input;
}

export function shelfCover(page: Page, title: string, author: string) {
  return shelfBook(page, title, author).locator('img[data-shelf-cover="true"]');
}
