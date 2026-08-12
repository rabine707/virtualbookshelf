import { describe, expect, test } from "vitest";
import {
  applyApprovedCommunityCovers,
  communityCoverRequestBooks,
} from "../../lib/books/community-cover";
import { Book } from "../../lib/books/client-library";

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    title: id === "1" ? "Fourth Wing" : "Lights Out",
    author: id === "1" ? "Rebecca Yarros" : "Navessa Allen",
    color: "#000",
    ...overrides,
  };
}

describe("community cover sync", () => {
  test("uses stable book IDs as RPC client keys", () => {
    expect(communityCoverRequestBooks([
      book("book-fourth-wing", {
        title: "Fourth Wing",
        author: "Rebecca Yarros",
        isbn: "9781649374042",
      }),
    ])).toEqual([{
      key: "book-fourth-wing",
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      isbn: "9781649374042",
      asin: "",
    }]);
  });

  test("applies approved covers only when no personal decision blocks them", () => {
    const approved = "https://example.com/community.jpg";
    const books = [
      book("1"),
      book("2", { preferredCover: { url: "https://example.com/personal.jpg", source: "User" } }),
      book("3", { coverFeedback: { rejected: [approved] } }),
    ];
    const result = applyApprovedCommunityCovers(books, [
      { client_key: "1", image_url: approved, source: "Verified" },
      { client_key: "2", image_url: approved, source: "Verified" },
      { client_key: "3", image_url: approved, source: "Verified" },
    ]);

    expect(result.changed).toBe(true);
    expect(result.books[0]).toMatchObject({
      preferredCover: { url: approved, source: "Community · Verified" },
      savedCovers: [{ url: approved, source: "Community · Verified" }],
    });
    expect(result.books[1]?.preferredCover?.url).toBe("https://example.com/personal.jpg");
    expect(result.books[2]?.preferredCover).toBeUndefined();
  });
});
