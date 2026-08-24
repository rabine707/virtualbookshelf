import { describe, expect, test } from "vitest";
import { balanceDefaultSpineColor, spineColorFromPixels } from "../../lib/books/cover-palette";

function pixels(colors: Array<[number, number, number]>) {
  return new Uint8Array(colors.flat());
}

describe("cover-derived spine colors", () => {
  test("keeps the hue of a strongly blue cover while darkening it for cloth", () => {
    const color = spineColorFromPixels(pixels(Array.from({ length: 20 }, () => [35, 102, 184])), 3);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(Number.parseInt(color!.slice(5, 7), 16)).toBeGreaterThan(Number.parseInt(color!.slice(1, 3), 16));
  });

  test("does not let sparse white lettering overpower the cover field", () => {
    const field = Array.from({ length: 30 }, () => [118, 32, 63] as [number, number, number]);
    const lettering = Array.from({ length: 4 }, () => [250, 248, 241] as [number, number, number]);
    const color = spineColorFromPixels(pixels([...field, ...lettering]), 3);
    expect(Number.parseInt(color!.slice(1, 3), 16)).toBeGreaterThan(Number.parseInt(color!.slice(3, 5), 16));
  });

  test("returns null when no usable pixels are present", () => {
    expect(spineColorFromPixels(new Uint8Array(), 4)).toBeNull();
  });

  test("preserves a tasteful cool cover-derived color", () => {
    expect(balanceDefaultSpineColor("#294f69", "blue-book")).toBe("#294f69");
  });

  test("redirects muddy warm colors deterministically", () => {
    const first = balanceDefaultSpineColor("#754a28", "same-book");
    expect(first).toBe(balanceDefaultSpineColor("#754a28", "same-book"));
    expect(first).not.toBe("#754a28");
  });

  test("distributes warm-heavy books across multiple tasteful families", () => {
    const colors = new Set(Array.from({ length: 24 }, (_, index) => (
      balanceDefaultSpineColor("#8a552d", `book-${index}`)
    )));
    expect(colors.size).toBeGreaterThanOrEqual(6);
  });
});
