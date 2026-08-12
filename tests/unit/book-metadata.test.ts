import { describe, expect, test } from "vitest";
import {
  applyBookMetadataUpdate,
  cleanBookAsin,
  cleanBookIsbn,
  migrateSpineCandidateIdentity,
} from "../../lib/books/book-metadata";
import { Book } from "../../lib/books/client-library";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "fourth-wing",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    color: "#000",
    ...overrides,
  };
}

describe("book metadata editing", () => {
  test("cleans ISBN and ASIN values", () => {
    expect(cleanBookIsbn('="978-1-64937-404-2"')).toBe("9781649374042");
    expect(cleanBookAsin("b0bx-q4jq2x")).toBe("B0BXQ4JQ2X");
    expect(cleanBookAsin("too-short")).toBe("");
  });

  test("updates title, author and identifier provenance without dropping book data", () => {
    const updated = applyBookMetadataUpdate(book({
      preferredCover: { url: "https://example.com/cover.jpg", source: "Google Books" },
    }), {
      title: "  Fourth   Wing  ",
      author: " Rebecca Yarros ",
      isbn: "978-1-64937-404-2",
      asin: "b0bxq4jq2x",
      source: "Manual correction",
      confidence: "high",
    });

    expect(updated).toMatchObject({
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "9781649374042",
      isbnSource: "Manual correction",
      isbnConfidence: "high",
      asin: "B0BXQ4JQ2X",
      preferredCover: { url: "https://example.com/cover.jpg", source: "Google Books" },
    });
  });

  test("clears identifier fields when the editor saves them blank", () => {
    const updated = applyBookMetadataUpdate(book({
      isbn: "9781649374042",
      isbnSource: "Old source",
      isbnConfidence: "medium",
      asin: "B0BXQ4JQ2X",
    }), {
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "",
      asin: "",
      source: "Manual correction",
      confidence: "high",
    });

    expect(updated.isbn).toBeUndefined();
    expect(updated.isbnSource).toBeUndefined();
    expect(updated.isbnConfidence).toBeUndefined();
    expect(updated.asin).toBeUndefined();
  });

  test("migrates only spine candidates belonging to the corrected book identity", () => {
    const candidates = [
      { id: "1", title: "Fourth Wing", author: "Rebecca Yarros", spineImage: "one" },
      { id: "2", title: "Lights Out", author: "Navessa Allen", spineImage: "two" },
    ];
    const migrated = migrateSpineCandidateIdentity(
      candidates,
      book(),
      book({ title: "Fourth Wing: The Empyrean" }),
    );

    expect(migrated.changed).toBe(true);
    expect(migrated.candidates).toEqual([
      { id: "1", title: "Fourth Wing: The Empyrean", author: "Rebecca Yarros", spineImage: "one" },
      { id: "2", title: "Lights Out", author: "Navessa Allen", spineImage: "two" },
    ]);
  });
});
