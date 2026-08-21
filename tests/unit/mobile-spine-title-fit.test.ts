import { describe, expect, test } from "vitest";
import { fitSpineTitle, pickSpineDesign } from "../../app/mobile-first/spineTemplates";

describe("mobile spine title fitting", () => {
  test.each([
    "Merry Christmas, You Filthy Animal",
    "A Very No Strings Halloween: Special Edition",
    "How My Neighbor Stole Christmas",
  ])("wraps a long imported title instead of clipping it on one line: %s", (title) => {
    const design = pickSpineDesign(title, "Example Author", "#6f4e37", false);
    const fitted = fitSpineTitle(title, 54, design);

    expect(fitted.lines.length).toBeGreaterThan(1);
    expect(Math.max(...fitted.lines.map((line) => line.length))).toBeLessThan(title.length);
  });

  test("condenses an unbreakable long word enough for a narrow spine", () => {
    const title = "Unfortunately Yours";
    const design = pickSpineDesign(title, "Tessa Bailey", "#6f4e37", false);
    const fitted = fitSpineTitle(title, 53, design);

    expect(fitted.lines).toContain("Unfortunately");
    expect(Math.min(...fitted.lineScales)).toBeLessThanOrEqual(.62);
  });
});

describe("mobile spine artwork assignment", () => {
  test.each([
    ["My Pucking Crush", "hockey-heart"],
    ["Playing Dirty", "playing-cards"],
    ["Pen Pal", "sealed-letter"],
    ["Hitched", "wedding-rings"],
    ["Untamed Vixen", "fox-moon"],
    ["Wreck Me", "moth-bloom"],
    ["Beautiful Venom", "wildflowers"],
  ])("selects book-specific artwork for %s", (title, artwork) => {
    const design = pickSpineDesign(title, "Example Author", "#4b3528", true);

    expect(design.artwork).toBe(artwork);
  });
});
