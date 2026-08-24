import { describe, expect, test } from "vitest";
import { storyTagsForBook } from "../../lib/books/story-tags";

const base = { id: "1", author: "Example Author", color: "#334455" };

describe("book story tags", () => {
  test("preserves stored metadata instead of guessing", () => {
    const tags = storyTagsForBook({ ...base, title: "Quiet Title", tropes: ["Forced proximity"], genres: ["Romance"], moods: ["Tender"] });
    expect(tags).toEqual({ tropes: ["Forced proximity"], genres: ["Romance"], moods: ["Tender"], themes: [], goodreads: [], source: "stored", inferred: false });
  });

  test("includes shelves imported from a Goodreads CSV", () => {
    const tags = storyTagsForBook({ ...base, title: "Beach Read", goodreadsTags: ["Favorites", "Enemies to lovers"] });
    expect(tags.goodreads).toEqual(["Favorites", "Enemies to lovers"]);
    expect(tags.tropes).toContain("Enemies to lovers");
  });

  test("suggests useful shelf tags when imported metadata is absent", () => {
    const tags = storyTagsForBook({ ...base, title: "Beach Read" });
    expect(tags.tropes).toContain("Enemies to lovers");
    expect(tags.tropes).toContain("Grumpy/sunshine");
    expect(tags.themes).toContain("Writers & creative process");
    expect(tags.source).toBe("curated");
    expect(tags.inferred).toBe(false);
  });

  test("recognizes recurring sports-romance titles", () => {
    const tags = storyTagsForBook({ ...base, title: "My Pucking Crush" });
    expect(tags.tropes).toContain("Sports romance");
    expect(tags.genres).toContain("Romance");
  });

  test("still labels lightweight title matching as suggested", () => {
    const tags = storyTagsForBook({ ...base, title: "My Pucking Crush" });
    expect(tags.source).toBe("suggested");
    expect(tags.inferred).toBe(true);
  });
});
