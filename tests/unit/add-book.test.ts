import { describe, expect, test } from "vitest";
import { addTypedBook, mergeBookSearchResult } from "../../lib/books/add-book";
import { sampleBooks } from "../../lib/books/client-library";

describe("add book helpers", () => {
  test("replaces the sample shelf when the first searched book is added", () => {
    const result = mergeBookSearchResult(sampleBooks, {
      id: "search-result",
      title: "Shelf Test Book",
      author: "Test Author",
      year: 2026,
      isbn: "9781234567897",
      coverUrl: "https://example.com/test.jpg",
      source: "Google Books",
    }, "Shelf Test Book", "Test Author");

    expect(result.books).toHaveLength(1);
    expect(result.books[0]).toMatchObject({
      title: "Shelf Test Book",
      author: "Test Author",
      isbn: "9781234567897",
      preferredCover: { url: "https://example.com/test.jpg", source: "Google Books" },
      savedCovers: [{ url: "https://example.com/test.jpg", source: "Google Books" }],
    });
  });

  test("upgrades a manually typed entry when a canonical search match arrives", () => {
    const manual = addTypedBook([], "Fourth Wing", "Rebecca Yarros");
    const result = mergeBookSearchResult(manual.books, {
      id: "fourth-wing",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "9781649374042",
      source: "Google Books",
    }, "Fourth Wing", "Rebecca");

    expect(result.replaced).toBe(true);
    expect(result.books).toHaveLength(1);
    expect(result.books[0]).toMatchObject({
      isbn: "9781649374042",
      importSource: "Book search",
    });
  });
});
