import { describe, expect, it } from "vitest";
import { isDeletableCatalogSpine } from "../../lib/curator-spine-delete";

const base = { id: "spine-1", storage_path: "book/spine.png", contributed_by: "curator-1" };
describe("curator spine deletion guard", () => {
  it.each(["clothbound", "dust-jacket", "special-edition", "left", "center", "right", "manual-upload", null])("allows curator deletion regardless of model %s", (model) => expect(isDeletableCatalogSpine({ ...base, model })).toBe(true));
  it("requires a database id and stored asset", () => {
    expect(isDeletableCatalogSpine({ ...base, id: "" })).toBe(false);
    expect(isDeletableCatalogSpine({ ...base, storage_path: "" })).toBe(false);
  });
});
