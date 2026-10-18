import { describe, expect, it } from "vitest";
import { familyEmailRecipient, familyTileUrl } from "../server/familyEmailIdentity";

describe("chosen identity stays safe in email headers and image URLs", () => {
  it("preserves accents, apostrophes and non-Latin names", () => {
    for (const name of ["Séna", "O'Neil", "แสง", "小林"]) {
      expect(familyEmailRecipient("fixture@example.invalid", "Cousin", name)).toBe('"Cousin ' + name + '" <fixture@example.invalid>');
      const url = new URL(familyTileUrl("Cousin", name));
      expect(url.searchParams.get("name")).toBe(name);
      expect(url.searchParams.get("artwork")).toBe("badge-v1");
    }
  });
  it("encodes reserved URL characters as a single chosen-name parameter", () => {
    const name = 'A&B #/"?name=Other';
    const url = new URL(familyTileUrl("Cousin", name));
    expect([...url.searchParams.keys()]).toEqual(["title", "name", "artwork"]);
    expect(url.searchParams.get("name")).toBe(name);
  });
  it("quotes a display name without adding another recipient", () => {
    expect(familyEmailRecipient("fixture@example.invalid", "Cousin", 'A" B')).toContain('A\\" B');
    expect(() => familyEmailRecipient("fixture@example.invalid", "Cousin", "Name\r\nBcc: other@example.invalid")).toThrow();
    expect(() => familyEmailRecipient("fixture@example.invalid\nother@example.invalid", "Cousin", "Fixture")).toThrow();
  });
});
