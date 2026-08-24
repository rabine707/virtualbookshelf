import { describe, expect, test } from "vitest";
import { cleanPublicTags, mergePublicTags } from "../../lib/books/public-tags";

describe("public book tags", () => {
  test("cleans duplicates and generic catalog labels", () => {
    expect(cleanPublicTags(["Fiction", "Romance / Contemporary", "romance contemporary", "Small towns"]))
      .toEqual(["Romance Contemporary", "Small towns"]);
  });

  test("keeps Google categories separate from Open Library subjects", () => {
    expect(mergePublicTags(["Young Adult Fiction / Romance"], ["Enemies", "Summer resorts"]))
      .toEqual({ genres: ["Young Adult Fiction Romance"], subjects: ["Enemies", "Summer resorts"] });
  });
});
