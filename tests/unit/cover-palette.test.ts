import { describe, expect, test } from "vitest";
import { spineColorFromPixels } from "../../lib/books/cover-palette";

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
});
