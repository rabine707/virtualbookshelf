import { describe, expect, test } from "vitest";
import {
  cloudFavoriteIdentities,
  cloudPayloadBooks,
  localBooksForCloud,
  mergeCloudBooks,
} from "../../lib/books/cloud-library";
import { Book, sampleBooks } from "../../lib/books/client-library";

function localBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    color: "#000",
    ...overrides,
  };
}

describe("cloud library merge", () => {
  test("never uploads the built-in sample shelf as a real library", () => {
    expect(localBooksForCloud(sampleBooks)).toEqual([]);
    expect(cloudPayloadBooks(sampleBooks, new Set())).toEqual([]);
  });

  test("merges cloud metadata while preserving local cover decisions", () => {
    const local = localBook({
      preferredCover: { url: "https://example.com/local.jpg", source: "User" },
      savedCovers: [{ url: "https://example.com/saved.jpg", source: "Saved" }],
      coverFeedback: { rejected: ["https://example.com/wrong.jpg"] },
    });
    const cloud = [{
      id: "book-1",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      color: "#111",
      isbn: "9781649374042",
      preferredCover: { url: "https://example.com/cloud.jpg", source: "Cloud" },
      favorite: true,
      cloudBookId: "cloud-row-1",
    }];

    const merged = mergeCloudBooks([local], cloud);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: "book-1",
      isbn: "9781649374042",
      preferredCover: { url: "https://example.com/local.jpg", source: "User" },
      savedCovers: [{ url: "https://example.com/saved.jpg", source: "Saved" }],
      coverFeedback: { rejected: ["https://example.com/wrong.jpg"] },
    });
    expect("cloudBookId" in merged[0]!).toBe(false);
  });

  test("extracts cloud favorites and includes local favorites in sync payloads", () => {
    const cloud = [{ title: "Fourth Wing", author: "Rebecca Yarros", favorite: true }];
    expect(cloudFavoriteIdentities(cloud)).toEqual(["fourth wing::rebecca yarros"]);

    const payload = cloudPayloadBooks(
      [localBook()],
      new Set(["fourth wing::rebecca yarros"]),
    );
    expect(payload[0]).toMatchObject({ favorite: true });
  });
});
