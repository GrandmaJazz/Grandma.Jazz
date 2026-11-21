import { afterEach, describe, expect, it, vi } from "vitest";
import { canTransition, curlPoint, paperFold, boundFold, foldPoint, cornerPeel, solveFoldGrip, shouldCompleteGesture, mapLogicalToSheet, shouldCompleteTurn } from "../client/src/garments/curl";
import { getLogicalPages, getPhysicalSheets, getSpread, parseManifest, readingPosition } from "../client/src/garments/issues";
import { fixtureIssue } from "../client/src/garments/fixtures";
import { loadImage } from "../client/src/garments/textures";
import { readFileSync } from "node:fs";
import { paperForIssue, withBrandPaper } from "../client/src/garments/brandPaper";

describe("published brand paper", () => {
  it("preserves each edition's original artwork and gives only its closing paper the G mark", () => {
    for (let number = 1; number <= 12; number++) {
      const issueNumber = String(number).padStart(3, "0");
      const issue = { ...fixtureIssue, issueNumber, isDevelopmentFixture: false };
      const branded = withBrandPaper(issue);
      expect(branded.cover).toBe(issue.cover);
      expect(branded.pages).toBe(issue.pages);
      const paper = paperForIssue(issueNumber);
      expect(branded.backCover.image).toBe(paper.closingImage);
      for (const kind of ["reverse", "closing"]) {
        const svg = readFileSync(new URL(`../client/public/garments/paper/${kind}-${issueNumber}-v2.svg`, import.meta.url), "utf8");
        expect(svg).toContain("garments-wordmark.png");
        expect(svg.includes("garments-mark.png")).toBe(kind === "closing");
        expect(svg).toContain("#f7f3ee");
        expect(svg).toContain("natural-paper-v2.webp");
        expect(svg).not.toContain("feTurbulence");
        if (kind === "closing") expect(svg).toContain("SourceAlpha");
      }
    }
    expect(withBrandPaper(fixtureIssue)).toBe(fixtureIssue);
  });
});

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
  it("lifts the grabbed corner first and mirrors top and bottom pulls", () => {
    const options = { pageWidth: 1, pageHeight: 1.4, progress: .15, cornerBias: .85 };
    const bottom = curlPoint(1, -.7, options);
    const top = curlPoint(1, .7, options);
    expect(bottom.x).toBeLessThan(top.x);
    const mirrored = curlPoint(1, .7, { ...options, cornerBias: -.85 });
    expect(mirrored.x).toBeCloseTo(bottom.x, 8);
    expect(mirrored.z).toBeCloseTo(bottom.z, 8);

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

describe("rigid fold geometry", () => {
  it("leaves the untouched sheet exactly static and turns a rigid triangle", () => {
    const fold = paperFold(1, .7, .6, .35, .06);
    for (const x of [0, .1, .25]) for (const y of [-.7, -.2, 0]) {
      expect(foldPoint(x, y, fold)).toMatchObject({ x, y, z: 0 });
    }
    const a = foldPoint(1, .7, fold), b = foldPoint(.98, .66, fold);
    expect(a.x).toBeCloseTo(.6, 8); expect(a.y).toBeCloseTo(.35, 8);
    expect(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)).toBeCloseTo(Math.hypot(.02,.04),8);
  });
  it("preserves lengths and angles through diagonal cylindrical bends", () => {
    for (const angle of [-.7,-.3,0,.3,.7]) {
      const fold = { nx: Math.cos(angle), ny: Math.sin(angle), start: .4, radius: .07 };
      const u = .4 + Math.PI * .07 * .45, x = u * fold.nx, y = u * fold.ny, e = 1e-5;
      const a = foldPoint(x,y,fold), b = foldPoint(x+e,y,fold), c = foldPoint(x,y+e,fold);
      const dx = [(b.x-a.x)/e,(b.y-a.y)/e,(b.z-a.z)/e], dy = [(c.x-a.x)/e,(c.y-a.y)/e,(c.z-a.z)/e];
      expect(Math.hypot(...dx)).toBeCloseTo(1,4); expect(Math.hypot(...dy)).toBeCloseTo(1,4);
      expect(dx.reduce((sum,n,i)=>sum+n*dy[i],0)).toBeCloseTo(0,3);
    }
  });
  it("lands flat without a stretch or offset", () => {
    for (const x of [0,.2,.7,1]) for(const y of [-.7,0,.7]) {
      expect(foldPoint(x,y,paperFold(1,.7,-1,.7,0)).x).toBeCloseTo(-x,8);
      expect(foldPoint(x,y,paperFold(1,.7,-1,.7,0))).toMatchObject({y,z:0});
      expect(foldPoint(x,y,paperFold(1,.7,1,.7,0))).toMatchObject({x,y,z:0});
    }
  });
  it.each([320,390,1050,1440])("keeps a diagonal corner on its screen target at %s", async width => {
    const { PerspectiveCamera, Vector3 } = await import("three");
    const height=844, w=.75, scale=Math.min((width-32)/(w*(width<900?1:2)),812);
    const distance=1.6+height/(2*Math.tan(Math.PI/10)*scale), groupX=width<900?-w/2:0;
    const camera=new PerspectiveCamera(36,width/height,.1,60);camera.position.set(0,1.6,distance);camera.lookAt(0,1.6,0);camera.updateMatrixWorld();
    const gutter=6*(2*(distance-1.6-.012)*Math.tan(Math.PI/10))/height;
    for(const direction of ["forward","backward"] as const) for(const gy of [-.44,.44]) {
      const sign=direction==="forward"?1:-1, hinge=width<900?gutter/2:sign*gutter/2;
      const original=new Vector3(groupX+hinge+sign*w,1.6+gy,1.613).project(camera);
      const targetX=(original.x+1)*width/2-sign*100, targetY=(1-original.y)*height/2-Math.sign(gy)*85;
      const result=solveFoldGrip({grabX:w,grabY:gy,targetX,targetY,width,height,pageWidth:w,cameraDistance:distance,groupX,hinge,direction});
      const point=foldPoint(w,gy,result.fold,direction);
      const screen=new Vector3(groupX+hinge+point.x,1.6+point.y,1.613+point.z).project(camera);
      expect(Math.abs((screen.x+1)*width/2-targetX)).toBeLessThan(.001);
      expect(Math.abs((1-screen.y)*height/2-targetY)).toBeLessThan(.001);
    }
  });
  it("accepts short normal flicks, but cancels returns and vertical-only pulls",()=>{
    expect(shouldCompleteGesture(24,.2,390)).toBe(true);
    expect(shouldCompleteGesture(24,0,390)).toBe(false);
    expect(shouldCompleteGesture(140,0,390)).toBe(true);
    expect(shouldCompleteGesture(140,-.3,390)).toBe(false);
    expect(shouldCompleteGesture(0,1,390)).toBe(false);
    expect(shouldCompleteGesture(7,10,390)).toBe(false);
    expect(shouldCompleteGesture(200,1,390,true)).toBe(false);
  });
});

describe("corner invitation peel", () => {
  it("keeps the body flat and the small corner in bounds throughout the prompt", () => {
    for (const p of [0,.02,.06,.12]) {
      const fold=cornerPeel(1,1.4,p);
      for(const x of [0,.2,.5]) for(const y of [-.3,0,.5]) expect(foldPoint(x,y,fold)).toMatchObject({x,y,z:0});
      const tip=foldPoint(1,-.7,fold);
      expect(tip.x).toBeCloseTo(1-p,8); expect(tip.y).toBeCloseTo(-.7+1.4*p*.5,8);
      expect(tip.z).toBeGreaterThanOrEqual(0); expect(tip.z).toBeLessThanOrEqual(.05);
    }
  });
});

describe("sewn spine constraints", () => {
  it("keeps the entire binding fixed through steep corner pulls", () => {
    for (const tx of [-1,-.5,0,.5,.9]) for (const ty of [-1.8,-.7,0,.7,1.8]) {
      const fold=boundFold(paperFold(1,.7,tx,ty,.065),1.4);
      for(let i=0;i<=40;i++) {
        const y=-.7+i*1.4/40;
        expect(foldPoint(0,y,fold)).toMatchObject({x:0,y,z:0});
      }
    }
  });
});
