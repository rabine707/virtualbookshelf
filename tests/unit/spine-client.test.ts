import { describe, expect, it } from "vitest";
import {
  generatedSpineUrl,
  shelfSpineDisplayAuthor,
  shelfSpineDisplayTitle,
  spineTitleScale,
  splitBookIdentity,
  storedSpineCrop,
  storedSpinePosition,
} from "../../lib/spines/client";

describe("shared spine client helpers", () => {
  it("splits the shelf button identity using the final title/author separator", () => {
    expect(splitBookIdentity("Lights Out — Navessa Allen")).toEqual({
      title: "Lights Out",
      author: "Navessa Allen",
    });
  });

  it("keeps a title-only identity usable", () => {
    expect(splitBookIdentity("Fourth Wing")).toEqual({ title: "Fourth Wing", author: "" });
  });

  it("removes trailing series metadata from shelf spine titles", () => {
    expect(shelfSpineDisplayTitle("Fourth Wing (The Empyrean, Book #1)")).toBe("Fourth Wing");
  });

  it("prefers the primary title when a long subtitle would overcrowd the spine", () => {
    expect(shelfSpineDisplayTitle("A Court of Thorns and Roses: Collector's Edition")).toBe("A Court of Thorns and Roses");
  });

  it("shortens long multi-part author names to first and last name", () => {
    expect(shelfSpineDisplayAuthor("Christopher James Alexander Writer")).toBe("Christopher Writer");
  });

  it("assigns stable typography scales", () => {
    expect(spineTitleScale("Short title")).toBe("normal");
    expect(spineTitleScale("A medium length title")).toBe("medium");
    expect(spineTitleScale("A deliberately very long spine title")).toBe("compact");
  });

  it("builds encoded cover-crop URLs", () => {
    expect(generatedSpineUrl("https://example.com/a cover.jpg?x=1", "right"))
      .toBe("/api/spine?v=3&position=right&cover=https%3A%2F%2Fexample.com%2Fa%20cover.jpg%3Fx%3D1");
  });

  it("recognizes saved crop positions without needing window.location", () => {
    expect(storedSpinePosition("/api/spine?v=3&position=left&cover=x")).toBe("left");
    expect(storedSpinePosition("/api/spine?v=3&position=center&cover=x")).toBe("center");
    expect(storedSpinePosition("https://cdn.example.com/custom-spine.png")).toBeNull();
  });

  it("treats non-crop saved art as custom spine artwork", () => {
    expect(storedSpineCrop("data:image/png;base64,AAAA")).toBe("custom");
  });
});
