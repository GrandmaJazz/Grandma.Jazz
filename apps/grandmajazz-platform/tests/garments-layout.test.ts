import { describe, expect, it } from "vitest";
import { boundedPan, fitReader, gestureDirection, latestFrameValue, readerTiming, releaseDuration, tapZone } from "../client/src/garments/readerLayout";
import { archiveTurn, releaseProgress, shelfRails } from "../client/src/garments/navigation";

describe("continuous page transactions and shelf rails", () => {
  it("visits every single-page face in both directions, including covers", () => {
    for (const count of [1, 7, 8, 17, 1000]) {
      for (let index = 0; index < count; index++) {
        const next = archiveTurn(index, count, true, "forward");
        const previous = archiveTurn(index, count, true, "backward");
        if (index === count - 1) expect(next).toBeNull();
        else expect(next).toMatchObject({ source: index, destination: index + 1, front: index, reverse: index + 1, right: index + 1 });
        if (index === 0) expect(previous).toBeNull();
        else expect(previous).toMatchObject({ source: index, destination: index - 1, front: index, reverse: index - 1 });
      }
    }
  });
  it("keeps physical front and reverse faces paired in spreads", () => {
    expect(archiveTurn(2, 16, false, "forward")).toMatchObject({ front: 2, reverse: 3, left: 1, right: 4, destination: 3 });
    expect(archiveTurn(4, 16, false, "backward")).toMatchObject({ front: 2, reverse: 3, left: 1, right: 4, destination: 2 });
  });
  it("continues release velocity without overshooting the paper endpoints", () => {
    for (const to of [0, 1]) for (const velocity of [-.003, 0, .003]) {
      expect(releaseProgress(.4, to, velocity, 250, 0)).toBe(.4);
      expect(releaseProgress(.4, to, velocity, 250, 1)).toBeCloseTo(to);
      for (let i = 0; i <= 100; i++) expect(releaseProgress(.4, to, velocity, 250, i / 100)).toBeGreaterThanOrEqual(0);
    }
    expect((releaseProgress(.4, 1, .001, 250, .0001) - .4) / .0001 / 250).toBeCloseTo(.001, 5);
    expect((releaseProgress(.4, 1, -.001, 250, .0001) - .4) / .0001 / 250).toBeCloseTo(-.001, 5);
  });
  it("keeps all editions reachable on bounded shelf rows", () => {
    for (const count of [1, 4, 6, 12, 23, 1000]) for (const mobile of [false, true]) {
      const items = Array.from({ length: count }, (_, i) => i);
      const rails = shelfRails(items, mobile);
      expect(rails.rows).toBeLessThanOrEqual(3);
      expect(rails.lanes.flat().slice().sort((a, b) => a - b)).toEqual(items);
      expect(rails.lanes.flatMap(lane => lane.slice(0, rails.columns))).toEqual(items.slice(0, rails.rows * rails.columns));
    }
  });
});

describe("immersive reader layout", () => {
  it("derives turn direction from live horizontal movement, not grab position", () => {
    expect(gestureDirection(-80, 2)).toBe("forward");
    expect(gestureDirection(80, 2)).toBe("backward");
    expect(gestureDirection(-30, 80)).toBeNull();
    expect(gestureDirection(-6, 0)).toBeNull();
    expect(gestureDirection(8, 0, 8)).toBeNull();
  });
  it.each([[320, 456], [390, 732], [844, 278], [768, 900], [1024, 656], [1440, 888]])("fits uncropped pages in %sx%s available space", (width, height) => {
    for (const aspect of [.5, .75, 1, 1.5]) {
      const fit = fitReader(width, height, aspect, 1);
      expect(fit.pagePixels * (fit.single ? 1 : 2)).toBeLessThanOrEqual(width - fit.inset * 2 + .001);
      expect(fit.heightPixels).toBeLessThanOrEqual(height - fit.inset * 2 + .001);
      expect(fit.pagePixels / fit.heightPixels).toBeCloseTo(aspect);
      if (!fit.single) expect(fit.pagePixels).toBeGreaterThanOrEqual(360);
    }
  });
  it("retains single pages in phone landscape and narrow tablet portrait", () => {
    expect(fitReader(844, 278, .75, 1).single).toBe(true);
    expect(fitReader(768, 900, .75, 1).single).toBe(true);
    expect(fitReader(1440, 888, .75, 1).single).toBe(false);
  });
  it("cannot pan a page outside its visible bounds", () => {
    expect(boundedPan(100, 1, 1.1, 1)).toBe(0);
    expect(boundedPan(100, 1, 1.1, 2)).toBeCloseTo(.45);
    expect(boundedPan(-100, 1, 1.1, 2)).toBeCloseTo(-.45);
  });
  it("reserves centre taps for controls and edges for page navigation", () => {
    expect(tapZone(.1)).toBe("previous"); expect(tapZone(.5)).toBe("centre"); expect(tapZone(.9)).toBe("next");
  });
});
describe("reader animation scheduling", () => {
  it("keeps only the latest pointer position for each frame", () => {
    const latest = latestFrameValue<number>();
    for (let i = 0; i < 100; i++) latest.set(i);
    expect(latest.take()).toBe(99); expect(latest.take()).toBeUndefined();
    latest.set(42); latest.clear(); expect(latest.take()).toBeUndefined();
  });
  it("uses quick bounded release timing without changing automated curl duration", () => {
    expect(readerTiming.pickup + readerTiming.opening).toBe(880);
    for (const complete of [true, false]) for (const p of [0, .25, .5, .75, 1]) for (const v of [-3, 0, 3]) {
      const duration = releaseDuration(p, complete, v);
      expect(duration).toBeGreaterThanOrEqual(140); expect(duration).toBeLessThanOrEqual(320);
    }
    expect(releaseDuration(.2, true, 2)).toBeLessThan(releaseDuration(.2, true, 0));
    expect(releaseDuration(0, true, 0, true)).toBe(360);
  });
});
