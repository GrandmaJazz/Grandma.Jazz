import { afterEach, describe, expect, it, vi } from "vitest";
import { canTransition, curlPoint, mapLogicalToSheet, shouldCompleteTurn } from "../client/src/garments/curl";
import { getLogicalPages, getPhysicalSheets, getSpread, parseManifest, readingPosition } from "../client/src/garments/issues";
import { fixtureIssue } from "../client/src/garments/fixtures";
import { loadImage } from "../client/src/garments/textures";

describe("physical magazine pagination", () => {
  it("keeps the cover on sheet zero and each reverse on the same physical sheet", () => {
    const sheets = getPhysicalSheets(fixtureIssue);
    expect(sheets[0].front).toBe(fixtureIssue.cover);
    expect(sheets[0].back).toBe(fixtureIssue.pages[0]);
    expect(sheets.at(-1)?.back).toBe(fixtureIssue.backCover);
    sheets.forEach(s => {
      expect(mapLogicalToSheet(s.frontLogicalIndex)).toEqual({ sheetIndex: s.sheetIndex, side: "front" });
      expect(mapLogicalToSheet(s.backLogicalIndex)).toEqual({ sheetIndex: s.sheetIndex, side: "back" });
    });
  });
  it("reveals inside cover on the left and page two on the right after opening", () => {
    expect(getSpread(fixtureIssue, 0).left).toBeNull();
    expect(getSpread(fixtureIssue, 0).right).toBe(fixtureIssue.cover);
    expect(getSpread(fixtureIssue, 1).left).toBe(fixtureIssue.pages[0]);
    expect(getSpread(fixtureIssue, 1).right).toBe(fixtureIssue.pages[1]);
    expect(getSpread(fixtureIssue, 99).right).toBeNull();
    expect(getSpread(fixtureIssue, 99).left).toBe(fixtureIssue.backCover);
  });
  it("pads an odd publication before the back cover, never after it", () => {
    const issue = { ...fixtureIssue, pages: fixtureIssue.pages.slice(0, 5) };
    const pages = getLogicalPages(issue);
    expect(pages.length).toBe(8);
    expect(pages[6].blank).toBe(true);
    expect(pages[7]).toBe(issue.backCover);
  });
  it("visits every logical face in single-page mode", () => {
    const pages = getLogicalPages(fixtureIssue);
    const positions = pages.map((_, i) => readingPosition(i, pages.length));
    expect(positions.map(p => p.page)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(positions[1].turned).toBe(positions[2].turned);
    expect(positions[1].focus).toBe("left"); expect(positions[2].focus).toBe("right");
    expect(readingPosition(-2, 8).page).toBe(0);
    expect(readingPosition(99, 8).page).toBe(7);
  });
});

describe("inextensible travelling curl", () => {
  it.each([0, .1, .25, .5, .75, .9, 1])("anchors the full binding and preserves fibre lengths at %s", progress => {
    for (const y of [-.7, 0, .7]) {
      const options = { pageWidth: 1, pageHeight: 1.4, progress, cornerBias: .9 };
      expect(curlPoint(0, y, options)).toMatchObject({ x: 0, y, z: 0 });
      let length = 0; let previous = curlPoint(0, y, options);
      for (let i = 1; i <= 500; i++) {
        const point = curlPoint(i / 500, y, options);
        length += Math.hypot(point.x - previous.x, point.z - previous.z);
        expect(point.z).toBeGreaterThanOrEqual(0); previous = point;
      }
      expect(length).toBeCloseTo(1, 4);
    }
  });
  it("uses identical sheet geometry in reverse, with flat exact endpoints", () => {
    const options = { pageWidth: 1, pageHeight: 1.4 };
    expect(curlPoint(1, 0, { ...options, progress: 0 })).toMatchObject({ x: 1, z: 0 });
    expect(curlPoint(1, 0, { ...options, progress: 1 }).x).toBeCloseTo(-1);
    for (const progress of [.2, .5, .8]) {
      expect(curlPoint(.7, .3, { ...options, progress, direction: "backward" }))
        .toEqual(curlPoint(.7, .3, { ...options, progress: 1 - progress }));
    }
  });
  it("is nonplanar at mid-turn, with continuous direction reversal", () => {
    const options = { pageWidth: 1, pageHeight: 1.4, progress: .5 };
    const a = curlPoint(.3, 0, options); const b = curlPoint(.6, 0, options); const c = curlPoint(.9, 0, options);
    expect(Math.abs((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x))).toBeGreaterThan(.005);
    const before = curlPoint(.8, 0, { ...options, progress: .4999 });
    const after = curlPoint(.8, 0, { ...options, progress: .5001 });
    expect(Math.hypot(after.x-before.x, after.z-before.z)).toBeLessThan(.002);
  });
  it("cancels interrupted gestures, honours flicks and rejects a reverse flick", () => {
    expect(shouldCompleteTurn(.8, 1, true)).toBe(false);
    expect(shouldCompleteTurn(.2, 0)).toBe(false);
    expect(shouldCompleteTurn(.2, 1)).toBe(true);
    expect(shouldCompleteTurn(.8, -.8)).toBe(false);
    expect(shouldCompleteTurn(.8, 0)).toBe(true);
  });
});

describe("state and content safety", () => {
  it("allows selection choreography and disallows duplicate selection or turns during close", () => {
    for (const [from, to] of [["browsing","loading"],["loading","selecting"],["selecting","opening"],["opening","reading"],["reading","dragging"],["dragging","settling"],["settling","reading"],["reading","closing"],["closing","returning"],["returning","browsing"]] as const) expect(canTransition(from, to)).toBe(true);
    expect(canTransition("closing", "dragging")).toBe(false);
    expect(canTransition("selecting", "loading")).toBe(false);
  });
  it("excludes development fixtures and missing artwork from published manifests", () => {
    expect(parseManifest({ logo: null, issues: [] }).issues).toEqual([]);
    expect(() => parseManifest({ logo: null, issues: [fixtureIssue] })).toThrow();
    const page = { id: "page", title: "Page", alt: "Description", image: "/garments/page.webp" };
    const issue = { ...fixtureIssue, isDevelopmentFixture: false, cover: page, backCover: page, pages: [] };
    expect(parseManifest({ logo: null, issues: [issue] }).issues).toHaveLength(1);
    expect(() => parseManifest({ logo: null, issues: [issue, issue] })).toThrow("Duplicate");
    expect(() => parseManifest({ logo: "javascript:alert(1)", issues: [] })).toThrow();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("rejects failed, stalled and aborted page images", async () => {
    vi.useFakeTimers();
    let image: { onerror: (() => void) | null; onload: (() => void) | null; src: string };
    class FakeImage { onerror = null; onload = null; src = ""; constructor() { image = this; } }
    vi.stubGlobal("Image", FakeImage); vi.stubGlobal("window", { setTimeout });
    const failed = loadImage("/missing.webp"); const failedCheck = expect(failed).rejects.toThrow("could not be loaded");
    image!.onerror!(); await failedCheck;
    const stalled = loadImage("/slow.webp"); const timeoutCheck = expect(stalled).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15001); await timeoutCheck;
    const abort = new AbortController(); const cancelled = loadImage("/page.webp", abort.signal);
    const abortCheck = expect(cancelled).rejects.toThrow("cancelled"); abort.abort(); await abortCheck;
  });
});
