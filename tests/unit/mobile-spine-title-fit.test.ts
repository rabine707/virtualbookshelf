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
  test("gives quiet titles a deterministic house-art fallback", () => {
    const design = pickSpineDesign("An Ordinary Afternoon", "Example Author", "#314665", false);
    expect(design.motif).not.toBeNull();
    expect(design.artwork).not.toBeNull();
  });
  test.each([
    ["My Pucking Crush", "hockey-heritage"],
    ["Playing Dirty", "playing-cards"],
    ["Pen Pal", "letter-roses"],
    ["Hitched", "wedding-rings"],
    ["Untamed Vixen", "fox-moon"],
    ["Wreck Me", "moth-moon"],
    ["Beautiful Venom", "skull-botanicals"],
    ["Beach Read", "coastal-sun"],
    ["Ugly Love", "broken-heart-roses"],
    ["People We Meet on Vacation", "travel-postcards"],
    ["The Paris Apartment", "travel-postcards"],
    ["How My Neighbor Stole Christmas", "apartment-window"],
    ["Merry Ever After", "mistletoe-bells"],
    ["The Silent Patient", "medical-herbarium"],
    ["Unfortunately Yours: A Vine Mess", "wine-vines"],
    ["Voyeur", "lace-mask"],
  ])("selects book-specific artwork for %s", (title, artwork) => {
    const design = pickSpineDesign(title, "Example Author", "#4b3528", true);

    expect(design.artwork).toBe(artwork);
  });

  test.each([
    ["The Gothic Castle", "gothic-castle"],
    ["The Hidden Key", "ornate-key"],
  ])("selects expanded engraving artwork for %s", (title, artwork) => {
    expect(pickSpineDesign(title, "Example Author", "#4b3528", false).artwork).toBe(artwork);
  });

  test("includes expanded engravings in the seeded house-art pool", () => {
    const quietArtwork = Array.from({ length: 80 }, (_, index) => (
      pickSpineDesign(`Quiet Title ${index}`, `Author ${index}`, "#314665", false).artwork
    ));
    const fantasyArtwork = Array.from({ length: 40 }, (_, index) => (
      pickSpineDesign(`Magic Tale ${index}`, `Author ${index}`, "#314665", false).artwork
    ));
    const darkArtwork = Array.from({ length: 40 }, (_, index) => (
      pickSpineDesign(`Dark Tale ${index}`, `Author ${index}`, "#314665", false).artwork
    ));
    expect(fantasyArtwork).toContain("gothic-castle");
    expect(new Set(darkArtwork).size).toBeGreaterThanOrEqual(8);
    expect(quietArtwork).toContain("ornate-key");
  });

  test("spreads quiet books across a broad house-art pool", () => {
    const artwork = new Set(Array.from({ length: 120 }, (_, index) => (
      pickSpineDesign(`Quiet Volume ${index}`, `Author ${index}`, "#314665", false).artwork
    )));
    expect(artwork.size).toBeGreaterThanOrEqual(8);
  });

  test("rotates sports titles through compatible engravings", () => {
    const artwork = new Set(Array.from({ length: 40 }, (_, index) => (
      pickSpineDesign(`Hockey Story ${index}`, `Player ${index}`, "#314665", false).artwork
    )));
    expect(artwork.size).toBe(3);
  });
});
