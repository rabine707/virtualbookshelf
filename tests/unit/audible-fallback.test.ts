import { describe, expect, test } from "vitest";
import { applyAudibleCoverFallback } from "../../lib/books/audible-fallback";
import { Book } from "../../lib/books/client-library";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "fourth-wing",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    color: "#000",
    ...overrides,
  };
}

describe("Audible cover fallback", () => {
  test("fills missing ASIN and cover without overriding stronger state", () => {
    const updated = applyAudibleCoverFallback(baseBook(), {
      asin: "B0BXQ4JQ2X",
      coverUrl: "https://example.com/audible.jpg",
      coverSource: "Audible",
    });

    expect(updated).toMatchObject({
      asin: "B0BXQ4JQ2X",
      preferredCover: {
        url: "https://example.com/audible.jpg",
        source: "Audible",
      },
      savedCovers: [{
        url: "https://example.com/audible.jpg",
        source: "Audible",
      }],
    });
  });

  test("does not resurrect rejected Audible art", () => {
    const updated = applyAudibleCoverFallback(baseBook({
      coverFeedback: { rejected: ["https://example.com/audible.jpg"] },
    }), {
      asin: "B0BXQ4JQ2X",
      coverUrl: "https://example.com/audible.jpg",
      coverSource: "Audible",
    });

    expect(updated.asin).toBe("B0BXQ4JQ2X");
    expect(updated.preferredCover).toBeUndefined();
    expect(updated.savedCovers).toBeUndefined();
  });

  test("does not override a manually accepted cover", () => {
    const updated = applyAudibleCoverFallback(baseBook({
      coverFeedback: { accepted: "https://example.com/chosen.jpg" },
    }), {
      coverUrl: "https://example.com/audible.jpg",
    });

    expect(updated.preferredCover).toBeUndefined();
  });
});
