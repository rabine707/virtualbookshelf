import { describe, expect, test } from "vitest";
import { storyTagsForBook } from "../../lib/books/story-tags";

const base = { id: "1", author: "Example Author", color: "#334455" };

describe("book story tags", () => {
  test("preserves stored metadata instead of guessing", () => {
    const tags = storyTagsForBook({ ...base, title: "Quiet Title", tropes: ["Forced proximity"], genres: ["Romance"], moods: ["Tender"] });
    expect(tags).toEqual({ tropes: ["Forced proximity"], genres: ["Romance"], moods: ["Tender"], inferred: false });
  });

  test("suggests useful shelf tags when imported metadata is absent", () => {
    const tags = storyTagsForBook({ ...base, title: "Beach Read" });
    expect(tags.tropes).toContain("Summer romance");
    expect(tags.moods).toContain("Warm & escapist");
    expect(tags.inferred).toBe(true);
  });

  test("recognizes recurring sports-romance titles", () => {
    const tags = storyTagsForBook({ ...base, title: "My Pucking Crush" });
    expect(tags.tropes).toContain("Sports romance");
    expect(tags.genres).toContain("Romance");
  });
});
