import { describe, expect, test } from "vitest";
import { spineRequestBookKey } from "../../lib/spine-requests";

describe("spine request book identity", () => {
  test("prefers a normalized ISBN", () => {
    expect(spineRequestBookKey({ title: "Any", author: "One", isbn: "978-1-234-56789-X" }))
      .toBe("isbn:978123456789X");
  });

  test("falls back to normalized title and author", () => {
    expect(spineRequestBookKey({ title: "  The Café! ", author: "M. Álvarez" }))
      .toBe("book:the cafe|m alvarez");
  });
});
