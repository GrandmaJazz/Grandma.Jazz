import { describe, expect, it } from "vitest";
import { boundedPan, fitReader, gestureDirection, phoneGestureDirection, latestFrameValue, readerTiming, releaseDuration, tapZone } from "../client/src/garments/readerLayout";
import { archiveTurn, releaseProgress, shelfRails, shelfLimit, shelfCoast, shelfLoopOffset, shelfLoopCoast, shelfLoopSlot, shelfEdgeOpacity } from "../client/src/garments/navigation";
import { cabinetLayout } from "../client/src/garments/cabinet";
import * as THREE from "three";
import { fitReaderShadow } from "../client/src/garments/readerShadow";

describe("continuous page transactions and shelf rails", () => {
  it("keeps the high-resolution page shadow tightly framed and stable during translation", () => {
    const light = new THREE.DirectionalLight(), group = new THREE.Group();
    group.position.set(-.5, 1.6, 1.6);
    fitReaderShadow(light, group, 1, 4 / 3);
    const camera = light.shadow.camera;
    const size = [camera.right - camera.left, camera.top - camera.bottom];
    expect(Math.max(...size)).toBeLessThan(3.2);
    // Under one CSS pixel per shadow texel even at a full-height desktop page.
    expect(Math.max(...size) / 2048 * 660).toBeLessThan(1.1);
    group.position.x = .2;
    fitReaderShadow(light, group, 1, 4 / 3);
    expect(camera.right - camera.left).toBeCloseTo(size[0], 10);
    expect(camera.top - camera.bottom).toBeCloseTo(size[1], 10);
    expect(camera.near).toBeGreaterThan(0);
    expect(camera.far).toBeGreaterThan(camera.near);
  });
  it("prints each desktop closing on page three's reverse beside the next cover", () => {
    const closing = Array.from({ length: 12 }, (_, index) => index * 4 + 3);
    for (let issue = 0; issue < 12; issue++) {
      const cover = issue * 4;
      expect(archiveTurn(cover, 48, false, "forward", closing)).toMatchObject({ front: cover, reverse: -1, right: cover + 1, destination: cover + 1 });
      const lastTurn = archiveTurn(cover + 2, 48, false, "forward", closing)!;
      expect(lastTurn).toMatchObject({ front: cover + 2, reverse: cover + 3, destination: issue === 11 ? 47 : cover + 4, right: issue === 11 ? -1 : cover + 4 });
      expect(lastTurn.required).toContain(cover + 3);
      expect(archiveTurn(lastTurn.destination, 48, false, "backward", closing)).toMatchObject({ front: cover + 2, reverse: cover + 3, destination: cover + 2 });
      expect(archiveTurn(cover + 2, 48, true, "forward", closing)).toMatchObject({ destination: cover + 3, reverse: -1 });
    }
  });
  it("devotes more screen space to covers while retaining both complete shelves", () => {
    for (const [width, height] of [[320, 405], [390, 500], [1050, 650], [1440, 600]]) {
      const mobile = width < 640;
      const layout = cabinetLayout(12, mobile, width / height);
      const coverPixels = 1.35 * Math.min(height * .98 / layout.height, width * .96 / layout.width);
      const oldHeight = (2 * 1.78 + 1.62) * .84;
      const oldWidth = Math.max((mobile ? 2 : 5) * 1.24 + .14 + .98, oldHeight * width / height * .96 / .98);
      const oldCoverPixels = (4 / 3) * Math.min(height * .98 / oldHeight, width * .96 / oldWidth);
      expect(coverPixels / oldCoverPixels).toBeGreaterThan(mobile ? 1.14 : 1.10);
      expect(layout.rows).toBe(2);
      expect(layout.slotWidth).toBeGreaterThan(1.10);
      // The entire 4:3 cover sits below the cornice and above its shelf.
      expect((layout.rowY(0) - .735) * layout.verticalScale + 1.35).toBeLessThan((layout.opening / 2 - .01) * layout.verticalScale);
    }
  });
  it("leaves editions to discover on both desktop rows with twelve editions", () => {
    const rails = shelfRails(Array.from({ length: 12 }, (_, i) => i), false);
    expect(rails.columns).toBe(5);
    expect(rails.lanes.map(lane => lane.length)).toEqual([6, 6]);
    expect(shelfLimit(rails.lanes, rails.columns)).toBe(1);
    for (let row = 0; row < 2; row++) {
      for (let index = 0; index < 6; index++) expect(shelfLoopSlot(index, index, 6, rails.columns).opacity).toBe(1);
    }
    expect(cabinetLayout(12, false, 1440 / 600).columns).toBe(5);
    expect(shelfRails(Array.from({ length: 12 }), true).columns).toBe(2);
  });
  it("wraps either shelf continuously with no position or velocity jump", () => {
    expect(shelfLoopOffset(6.2, 6)).toBeCloseTo(.2);
    expect(shelfLoopOffset(-.2, 6)).toBeCloseTo(5.8);
    expect(shelfLoopOffset(100, 1)).toBe(0);
    for (const velocity of [-.02, .02]) {
      const a = shelfLoopCoast(5.9, velocity, 16, 6);
      const b = shelfLoopCoast(5.9, velocity, 17, 6);
      const distance = Math.min(Math.abs(b.offset - a.offset), 6 - Math.abs(b.offset - a.offset));
      expect(distance).toBeLessThan(.021);
      expect(a.done).toBe(false);
      expect(shelfLoopCoast(5.9, velocity, 2000, 6).done).toBe(true);
    }
    expect(shelfLoopSlot(0, 0, 1, 1)).toEqual({ centre: 0, opacity: 1 });
    expect(shelfLoopSlot(0, .5, 5, 6).opacity).toBe(1);
    for (const columns of [2, 6]) {
      const before = shelfLoopSlot(0, .5 - .0001, 6, columns);
      const after = shelfLoopSlot(0, .5 + .0001, 6, columns);
      expect(before.opacity).toBe(1);
      expect(after.opacity).toBe(1);
      expect(shelfLoopSlot(0, 0, 6, columns).opacity).toBe(1);
      // Every edition occupies the first opaque slot during one circuit.
      for (let index = 0; index < 6; index++) expect(shelfLoopSlot(index, index, 6, columns).opacity).toBe(1);
    }
  });
  it("visits every single-page face in both directions, including covers", () => {
    for (const count of [1, 7, 8, 17, 1000]) {
      for (let index = 0; index < count; index++) {
        const next = archiveTurn(index, count, true, "forward");
        const previous = archiveTurn(index, count, true, "backward");
        if (index === count - 1) expect(next).toBeNull();
        else expect(next).toMatchObject({ source: index, destination: index + 1, front: index, reverse: -1, right: index + 1 });
        if (index === 0) expect(previous).toBeNull();
        else expect(previous).toMatchObject({ source: index, destination: index - 1, front: index - 1, reverse: -1, right: index });
      }
    }
  });
  it("uses identical artwork order on phones and desktop, with an independent paper reverse", () => {
    for (const single of [false, true]) for (let index = 0; index < 48; index++) {
      const next = archiveTurn(index, 48, single, "forward");
      const previous = archiveTurn(index, 48, single, "backward");
      if (next) expect(next).toMatchObject({ source: index, destination: index + 1, front: index, reverse: -1, right: index + 1 });
      if (previous) expect(previous).toMatchObject({ source: index, destination: index - 1, front: index - 1, reverse: -1, right: index });
    }
  });
  it("leaves the cover opaque until its visible pixels reach the actual shelf edge", () => {
    for (const x of [-1, -.5, 0, .5, 1]) expect(shelfEdgeOpacity(x, 1.2, .05)).toBe(1);
    expect(shelfEdgeOpacity(1.175, 1.2, .05)).toBeCloseTo(.5);
    expect(shelfEdgeOpacity(1.2, 1.2, .05)).toBe(0);
    expect(shelfEdgeOpacity(-1.2, 1.2, .05)).toBe(0);
    // A partly clipped cover keeps its whole interior opaque.
    expect(shelfEdgeOpacity(-.9, 1.2, .05)).toBe(1);
    expect(shelfEdgeOpacity(-1.4, 1.2, .05)).toBe(0);
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
  it("coasts through fractional positions, slows continuously, and stops at either row end", () => {
    const samples = [0, 16, 32, 48, 64].map(t => shelfCoast(.4, .003, t, 4).offset);
    expect(samples[0]).toBe(.4);
    expect(samples[1]).toBeGreaterThan(samples[0]);
    expect(samples[2] - samples[1]).toBeLessThan(samples[1] - samples[0]);
    expect(samples[3] % 1).not.toBe(0);
    expect(shelfCoast(.4, .003, 2000, 4).done).toBe(true);
    expect(shelfCoast(3.8, .02, 1000, 4)).toEqual({ offset: 4, done: true });
    expect(shelfCoast(.2, -.02, 1000, 4)).toEqual({ offset: 0, done: true });
    expect(shelfCoast(1.7, 0, 100, 4)).toEqual({ offset: 1.7, done: true });
  });
  it("keeps all editions reachable on bounded shelf rows", () => {
    for (const count of [1, 4, 6, 12, 23, 1000]) for (const mobile of [false, true]) {
      const items = Array.from({ length: count }, (_, i) => i);
      const rails = shelfRails(items, mobile);
      expect(rails.rows).toBe(2);
      expect(shelfLimit(rails.lanes, rails.columns)).toBe(Math.max(0, Math.ceil(count / 2) - rails.columns));
      expect(rails.lanes.flat().slice().sort((a, b) => a - b)).toEqual(items);
      expect(rails.lanes.flatMap(lane => lane.slice(0, rails.columns)).sort((a, b) => a - b)).toEqual(items.slice(0, rails.rows * rails.columns));
    }
  });
});

describe("immersive reader layout", () => {
  it("starts phone corners promptly without turning on a vertical centre scroll", () => {
    expect(phoneGestureDirection(-4, 16, true)).toBe("forward");
    expect(phoneGestureDirection(4, 16, true)).toBe("backward");
    expect(phoneGestureDirection(-4, 0, false)).toBeNull();
    expect(phoneGestureDirection(-10, 80, false)).toBeNull();
    expect(phoneGestureDirection(-20, 8, false)).toBe("forward");
    expect(releaseDuration(0, true, 0, true, true)).toBe(180);
    expect(releaseDuration(.7, true, 1, false, true)).toBeLessThan(releaseDuration(.7, true, 1));
  });
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
    expect(readerTiming.pickup).toBeGreaterThanOrEqual(250);
    expect(readerTiming.pickup).toBeLessThanOrEqual(450);
    expect(readerTiming.closing + readerTiming.returning).toBeLessThanOrEqual(700);
    for (const complete of [true, false]) for (const p of [0, .25, .5, .75, 1]) for (const v of [-3, 0, 3]) {
      const duration = releaseDuration(p, complete, v);
      expect(duration).toBeGreaterThanOrEqual(90); expect(duration).toBeLessThanOrEqual(220);
    }
    expect(releaseDuration(.2, true, 2)).toBeLessThan(releaseDuration(.2, true, 0));
    expect(releaseDuration(0, true, 0, true)).toBe(260);
  });
});
