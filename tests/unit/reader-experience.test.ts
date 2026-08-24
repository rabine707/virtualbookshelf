import { describe, expect, test } from "vitest";
import { relatedShelfBooks, seriesInfo, seriesInfoForBook } from "../../lib/books/reader-experience";

const base = { author: "A Writer", color: "#000" };

describe("reader experience helpers", () => {
  test("extracts a numbered series from Goodreads-style titles", () => {
    expect(seriesInfo("Icebreaker (Maple Hills, #1)")).toEqual({ name: "Maple Hills", number: 1 });
    expect(seriesInfo("Standalone (Special Edition)")).toBeNull();
  });

  test("lets personal series corrections override imported titles", () => {
    expect(seriesInfoForBook({ ...base, id: "1", title: "Standalone", seriesName: "My Series", seriesNumber: 2 })).toEqual({ name: "My Series", number: 2 });
    expect(seriesInfoForBook({ ...base, id: "2", title: "Icebreaker (Maple Hills, #1)", seriesExcluded: true })).toBeNull();
  });

  test("finds related books from shared shelf tags", () => {
    const selected = { ...base, id: "1", title: "First", genres: ["Romance"], tropes: ["Slow burn"] };
    const related = relatedShelfBooks(selected, [selected, { ...base, id: "2", title: "Second", genres: ["Romance"] }, { ...base, id: "3", title: "Other", author: "Someone Else", genres: ["History"] }]);
    expect(related.map((book) => book.id)).toEqual(["2"]);
  });
});
