import { describe, expect, test } from "vitest";
import {
  applyRomanceShelfOutcome,
  needsRomanceShelfLookup,
  ROMANCE_MISS_TTL_MS,
  RomanceShelfBook,
} from "../../lib/books/romance-shelf";

function book(overrides: Partial<RomanceShelfBook> = {}): RomanceShelfBook {
  return {
    id: "lights-out",
    title: "Lights Out",
    author: "Navessa Allen",
    color: "#000",
    ...overrides,
  };
}

describe("Romance.io shelf enrichment", () => {
  test("uses a Romance.io match when no manual choice blocks it", () => {
    const updated = applyRomanceShelfOutcome(book(), {
      url: "https://example.com/romance.jpg",
      discoveredRomanceioId: "romance-123",
    }, 1000);

    expect(updated).toMatchObject({
      romanceioId: "romance-123",
      romanceioCoverUrl: "https://example.com/romance.jpg",
      romanceioCheckedAt: 1000,
      romanceioNoMatch: false,
      preferredCover: {
        url: "https://example.com/romance.jpg",
        source: "Romance.io",
      },
    });
  });

  test("records a miss and honors the three-day miss cache", () => {
    const checkedAt = 5000;
    const missed = applyRomanceShelfOutcome(book(), {}, checkedAt);
    expect(missed.romanceioNoMatch).toBe(true);
    expect(needsRomanceShelfLookup(missed, checkedAt + ROMANCE_MISS_TTL_MS - 1)).toBe(false);
    expect(needsRomanceShelfLookup(missed, checkedAt + ROMANCE_MISS_TTL_MS + 1)).toBe(true);
  });

  test("does not override accepted or rejected cover decisions", () => {
    const url = "https://example.com/romance.jpg";
    const accepted = applyRomanceShelfOutcome(book({
      coverFeedback: { accepted: "https://example.com/chosen.jpg" },
    }), { url });
    const rejected = applyRomanceShelfOutcome(book({
      coverFeedback: { rejected: [url] },
    }), { url });

    expect(accepted.preferredCover).toBeUndefined();
    expect(rejected.preferredCover).toBeUndefined();
  });
});
