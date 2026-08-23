import { describe, expect, it } from "vitest";
import { isExplicitCuratorUpload } from "../../lib/curator-spine-delete";

const base = { id: "spine-1", storage_path: "book/spine.png", contributed_by: "curator-1" };
describe("curator spine deletion guard", () => {
  it.each(["clothbound", "dust-jacket", "special-edition"])("allows curator-uploaded %s spines", (model) => expect(isExplicitCuratorUpload({ ...base, model }, true)).toBe(true));
  it.each([null, "left", "center", "right", "gemini-image"])("protects generated/fallback model %s", (model) => expect(isExplicitCuratorUpload({ ...base, model }, true)).toBe(false));
  it("requires curator provenance", () => expect(isExplicitCuratorUpload({ ...base, model: "clothbound" }, false)).toBe(false));
});
