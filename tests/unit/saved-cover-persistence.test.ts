import { describe, expect, test } from "vitest";
import { Book, mergeGoodreadsFeedback } from "../../lib/books/client-library";

describe("saved cover persistence", () => {
  test("keeps saved covers when Goodreads refreshes an existing book", () => {
    const current: Book[] = [{
      id: "old",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      color: "#000",
      preferredCover: { url: "https://example.com/current.jpg", source: "Google Books" },
      savedCovers: [
        { url: "https://example.com/current.jpg", source: "Google Books" },
        { url: "https://example.com/alternate.jpg", source: "LibraryThing" },
      ],
    }];
    const imported: Book[] = [{
      id: "9781649374042",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "9781649374042",
      isbnSource: "Goodreads export",
      isbnConfidence: "high",
      importSource: "Goodreads",
      color: "#111",
    }];

    const [merged] = mergeGoodreadsFeedback(current, imported);
    expect(merged?.savedCovers).toEqual(current[0]?.savedCovers);
  });
});
