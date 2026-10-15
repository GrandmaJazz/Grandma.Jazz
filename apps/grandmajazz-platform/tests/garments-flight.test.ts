import { describe, expect, it } from "vitest";
import { coverFlight, readScreenRect } from "../client/src/garments/readerFlight";

describe("cover flight endpoints", () => {
  it.each([320, 390, 1050, 1440])("lands a uniformly scaled cover exactly on its shelf at %ipx", width => {
    const stage = { left: 8, top: 12, width: width - 16, height: 820 };
    const cover = { left: width / 2 - 150, top: 210, width: 300, height: 400 };
    const shelf = { left: width < 400 ? -12 : 110, top: 420, width: 120, height: 160 };
    const transform = coverFlight(cover, shelf, stage);
    const [x, y, scale] = transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([-\d.]+)\)/)!.slice(1).map(Number);
    expect(stage.left + (cover.left - stage.left) * scale + x).toBeCloseTo(shelf.left);
    expect(stage.top + (cover.top - stage.top) * scale + y).toBeCloseTo(shelf.top);
    expect(cover.width * scale).toBeCloseTo(shelf.width);
    expect(cover.height * scale).toBeCloseTo(shelf.height);
  });
  it("ignores incomplete transition measurements", () => {
    for (const input of [undefined, "bad-json", "null", '{"left":0,"top":0,"width":0,"height":40}']) expect(readScreenRect(input)).toBeNull();
  });
});
