import { describe, expect, it } from "vitest";
import { sharedSpineRenderMode } from "../../lib/spines/shared-render-mode";

describe("shared spine typography mode", () => {
  it.each(["AI-integrated", "curator-clothbound", "curator-dust-jacket", "curator-special-edition"])("does not overlay typography on %s artwork", (provider) => {
    expect(sharedSpineRenderMode(provider)).toBe("integrated");
  });

  it.each(["cover-crop", "AI-overlay", null, undefined])("keeps typography for %s artwork", (provider) => {
    expect(sharedSpineRenderMode(provider)).toBe("overlay");
  });
});
