import { describe, expect, test } from "vitest";
import {
  cleanIsbn as cleanMatchingIsbn,
  deepAuthorLastName,
  deepBareKeywords,
  deepKeywordSearchText,
  deepTitleVariants,
  matchDeepBookCandidate,
  normalizeBookText,
  scoreBookCandidate,
  stripGoodreadsSeriesSuffix,
  stripSeriesSuffix,
} from "../../lib/books/matching";
import {
  allowedCovers,
  Book,
  cleanIsbn,
  mergeAudibleBooks,
  mergeGoodreadsFeedback,
  normalizeAudibleRow,
  normalizeGoodreadsRow,
} from "../../lib/books/client-library";

describe("book matching helpers", () => {
  test("normalizes punctuation and casing", () => {
    expect(normalizeBookText("  Butcher & Blackbird! ")).toBe("butcher blackbird");
  });

  test("cleans and validates ISBNs", () => {
    expect(cleanMatchingIsbn("978-1-64937-404-2")).toBe("9781649374042");
    expect(cleanMatchingIsbn("not-an-isbn")).toBeNull();
    expect(cleanIsbn('="978-1-64937-404-2"')).toBe("9781649374042");
  });

  test("strips series metadata without removing ordinary parentheticals", () => {
    expect(stripSeriesSuffix("Fourth Wing (The Empyrean, #1)")).toBe("Fourth Wing");
    expect(stripSeriesSuffix("A Book (Special Edition)")).toBe("A Book (Special Edition)");
    expect(stripGoodreadsSeriesSuffix("Lights Out - Book 2")).toBe("Lights Out");
  });

  test("requires meaningful author evidence for lightweight matches", () => {
    expect(scoreBookCandidate("Fourth Wing", "Rebecca Yarros", "Fourth Wing", ["Rebecca Yarros"])).toBeGreaterThan(0);
    expect(scoreBookCandidate("Fourth Wing", "Rebecca Yarros", "Fourth Wing", ["Someone Else"])).toBe(0);
  });

  test("accepts deep subtitle/series variants with matching author evidence", () => {
    const result = matchDeepBookCandidate(
      "Lights Out: A Dark Stalker Romance (Into Darkness, #1)",
      "Navessa Allen",
      "Lights Out",
      ["Navessa Allen"],
    );

    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThan(10);
    expect(deepTitleVariants("Lights Out: A Dark Stalker Romance (Into Darkness, #1)")).toContain("Lights Out");
  });

  test("builds bounded keyword searches from useful title words", () => {
    expect(deepKeywordSearchText("The Serpent and the Wings of Night", "Carissa Broadbent")).toContain("broadbent");
    expect(deepBareKeywords("The Serpent and the Wings of Night").split(" ").length).toBeLessThanOrEqual(5);
    expect(deepAuthorLastName("Carissa Broadbent")).toBe("broadbent");
  });
});

describe("library import and cover helpers", () => {
  test("normalizes Goodreads rows and preserves strong ISBN provenance", () => {
    const book = normalizeGoodreadsRow({
      Title: "Fourth Wing",
      Author: "Rebecca Yarros",
      "My Rating": "5",
      "Year Published": "2023",
      "Exclusive Shelf": "read",
      ISBN13: '="978-1-64937-404-2"',
    }, 0);

    expect(book).toMatchObject({
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      rating: 5,
      year: "2023",
      shelf: "read",
      isbn: "9781649374042",
      isbnSource: "Goodreads export",
      isbnConfidence: "high",
      importSource: "Goodreads",
    });
  });

  test("normalizes audible-cli rows including BOM headers and cover URLs", () => {
    const book = normalizeAudibleRow({
      "\uFEFFTitle": "Fourth Wing",
      Authors: "Rebecca Yarros",
      ASIN: "B0BXQ4JQ2X",
      release_date: "2023-05-02",
      cover_url: "http://example.com/fourth-wing.jpg",
    }, 0);

    expect(book).toMatchObject({
      id: "audible:B0BXQ4JQ2X",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      year: "2023",
      asin: "B0BXQ4JQ2X",
      importSource: "Audible",
      preferredCover: {
        url: "https://example.com/fourth-wing.jpg",
        source: "Audible",
      },
    });
  });

  test("merges Audible metadata into a matching Goodreads series title", () => {
    const current: Book[] = [{
      id: "9781649374042",
      title: "Fourth Wing (The Empyrean, #1)",
      author: "Rebecca Yarros",
      importSource: "Goodreads",
      color: "#000",
      preferredCover: { url: "https://example.com/preferred.jpg", source: "Google Books" },
    }];
    const audible: Book[] = [{
      id: "audible:B0BXQ4JQ2X",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      asin: "B0BXQ4JQ2X",
      importSource: "Audible",
      color: "#111",
      preferredCover: { url: "https://example.com/audible.jpg", source: "Audible" },
    }];

    const merged = mergeAudibleBooks(current, audible);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      asin: "B0BXQ4JQ2X",
      importSource: "Goodreads + Audible",
      preferredCover: { url: "https://example.com/preferred.jpg", source: "Google Books" },
    });
  });

  test("preserves community choices and identifiers when Goodreads refreshes a book", () => {
    const current: Book[] = [{
      id: "old",
      title: "Lights Out",
      author: "Navessa Allen",
      asin: "audible-lights-out",
      romanceioId: "romance-123",
      importSource: "Audible",
      color: "#000",
      preferredCover: { url: "https://example.com/chosen.jpg", source: "Google Books" },
      coverFeedback: { rejected: ["https://example.com/wrong.jpg"] },
    }];
    const imported: Book[] = [{
      id: "9781638931478",
      title: "Lights Out",
      author: "Navessa Allen",
      isbn: "9781638931478",
      isbnSource: "Goodreads export",
      isbnConfidence: "high",
      importSource: "Goodreads",
      color: "#111",
    }];

    const merged = mergeGoodreadsFeedback(current, imported);
    expect(merged[0]).toMatchObject({
      isbn: "9781638931478",
      isbnSource: "Goodreads export",
      isbnConfidence: "high",
      asin: "audible-lights-out",
      romanceioId: "romance-123",
      importSource: "Goodreads + Audible",
      preferredCover: { url: "https://example.com/chosen.jpg", source: "Google Books" },
      coverFeedback: { rejected: ["https://example.com/wrong.jpg"] },
    });
  });

  test("deduplicates cover candidates and removes rejected editions", () => {
    const book: Book = {
      id: "lights-out",
      title: "Lights Out",
      author: "Navessa Allen",
      color: "#000",
      coverFeedback: {
        rejected: ["https://example.com/wrong.jpg"],
        wrongEdition: ["https://example.com/edition.jpg"],
      },
    };

    expect(allowedCovers(book, [
      { url: "https://example.com/right.jpg", source: "Google Books" },
      { url: "https://example.com/right.jpg", source: "Open Library" },
      { url: "https://example.com/wrong.jpg", source: "Google Books" },
      { url: "https://example.com/edition.jpg", source: "LibraryThing" },
    ])).toEqual([
      { url: "https://example.com/right.jpg", source: "Google Books" },
    ]);
  });
});
