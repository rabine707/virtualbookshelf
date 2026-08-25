import { describe, expect, test } from "vitest";
import { Book, CoverResponse } from "../../lib/books/client-library";
import { applyImportedCoverLookup, importedCoverLookup } from "../../lib/books/imported-cover-finder";

const exactResponse: CoverResponse = {
  url: "https://example.com/exact.jpg",
  source: "Google Books",
  options: [{ url: "https://example.com/exact.jpg", source: "Google Books" }],
};

describe("imported cover finder", () => {
  test("automatically applies only a high-confidence ISBN match", () => {
    const book: Book = {
      id: "9781649374042",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "9781649374042",
      isbnConfidence: "high",
      color: "#123456",
      readerNote: "Keep this",
    };
    const lookup = importedCoverLookup(book, exactResponse);
    expect(lookup.exactCover).toEqual(exactResponse.options?.[0]);
    expect(applyImportedCoverLookup(book, lookup)).toMatchObject({
      preferredCover: exactResponse.options?.[0],
      savedCovers: [exactResponse.options?.[0]],
      readerNote: "Keep this",
    });
  });

  test("leaves title-only matches for review", () => {
    const book: Book = { id: "title-only", title: "A Book", author: "An Author", color: "#123456" };
    const lookup = importedCoverLookup(book, { ...exactResponse, discoveredIsbn: "9781234567897" });
    const updated = applyImportedCoverLookup(book, lookup);
    expect(lookup.exactCover).toBeUndefined();
    expect(updated.preferredCover).toBeUndefined();
    expect(updated).toMatchObject({ isbn: "9781234567897", isbnConfidence: "medium" });
  });

  test("never overwrites a saved cover or other reader choices", () => {
    const book = {
      id: "saved",
      title: "Saved Book",
      author: "Reader",
      isbn: "9781649374042",
      isbnConfidence: "high" as const,
      color: "#123456",
      preferredCover: { url: "https://example.com/custom.jpg", source: "Reader upload" },
      readerNote: "My note",
      defaultSpine: true,
    } satisfies Book & { defaultSpine: boolean };
    const updated = applyImportedCoverLookup(book, importedCoverLookup(book, exactResponse));
    expect(updated).toBe(book);
    expect(updated.preferredCover).toEqual(book.preferredCover);
    expect((updated as typeof book).defaultSpine).toBe(true);
  });
});
