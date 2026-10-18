import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureIssue } from "../client/src/garments/fixtures";
const { failedPages, bufferFault } = vi.hoisted(() => ({ failedPages: new Set<number>(), bufferFault: { armed: false, reject: undefined as ((error: Error) => void) | undefined } }));
const { coverRequests } = vi.hoisted(() => ({ coverRequests: { paused: false, calls: [] as { image: string; height: number; release: () => void }[] } }));
const { textureBudgets } = vi.hoisted(() => ({ textureBudgets: [] as number[] }));
const { retainedWindows } = vi.hoisted(() => ({ retainedWindows: [] as { keep: number[]; visible: number[] }[] }));
const { rendered } = vi.hoisted(() => ({ rendered: { scene: undefined as any, camera: undefined as any, foldWidths: [] as number[], pageFrames: [] as Record<string, unknown>[], sizes: [] as number[][], poses: [] as { mode?: string; camera: number[] }[], mode: undefined as undefined | (() => string) } }));

vi.mock("three", async original => {
  const actual = await original<typeof import("three")>();
  return { ...actual, TextureLoader: class { load(_url: string, done: (texture: any) => void) { queueMicrotask(() => done(new actual.Texture())); } }, WebGLRenderer: class {
    domElement = document.createElement("canvas");
    shadowMap = {}; ratio = 1;
    capabilities = { maxTextureSize: 4096, getMaxAnisotropy: () => 8 };
    info = { render: { triangles: 0 }, memory: { textures: 0 } };
    setClearColor() {} setPixelRatio(value: number) { this.ratio = value; } getPixelRatio() { return this.ratio; }
    setSize(width: number, height: number) { rendered.sizes.push([width, height]); } render(scene: any, camera: any) {
      rendered.poses.push({ mode: rendered.mode?.(), camera: camera.position.toArray() });
      rendered.scene = scene; rendered.camera = camera; scene.updateMatrixWorld(); camera.updateMatrixWorld();
      const pageFrame: Record<string, unknown> = {};
      scene.traverse((mesh: any) => {
        if (mesh.name?.startsWith("garments-")) {
          let visible = true; for (let node = mesh; node; node = node.parent) visible &&= node.visible;
          if (visible) pageFrame[mesh.name] = mesh.material.map?.userData.paperReverse ? "paper" : mesh.material.map?.userData.pageIndex;
        }
        if (!mesh.isMesh || !mesh.material.isMeshBasicMaterial || mesh.material.color.getHexString() !== "0b0b0b") return;
        for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
        const half = mesh.geometry.parameters.width / 2;
        const left = new actual.Vector3(-half, 0, 0).applyMatrix4(mesh.matrixWorld).project(camera);
        const right = new actual.Vector3(half, 0, 0).applyMatrix4(mesh.matrixWorld).project(camera);
        rendered.foldWidths.push(Math.abs(right.x - left.x) * this.domElement.getBoundingClientRect().width / 2);
      });
      rendered.pageFrames.push(pageFrame);
    }
    getContext() { return { getExtension: () => null, getParameter: () => "unit-test renderer" }; }
    dispose() {}
  } };
});
vi.mock("../client/src/garments/textures", async () => {
  const { Texture } = await import("three");
  return { pageTexture: async (page: any, _issue: any, height: number) => { if (coverRequests.paused) await new Promise<void>(release => coverRequests.calls.push({ image: page.image, height, release })); const texture = new Texture(); texture.userData.paperReverse = page.id === "phone-paper-reverse"; return texture; }, PageTextures: class {
    constructor(_issue: any, _pages: any, resolution: number) { textureBudgets.push(resolution); }
    texture = new Texture(); pages = new Map<number, any>(); ensure = async (indices: number[]) => { if (bufferFault.armed && indices.length >= 4) return new Promise<void>((_, reject) => { bufferFault.reject = reject; }); if (indices.some(i => failedPages.has(i))) throw new Error("Page artwork could not be loaded"); }; seed() {} ensurePreview = async () => {}; ensureAvailable = async (indices: number[]) => this.ensure(indices); get = (index: number) => { if (index < 0) return undefined; if (!this.pages.has(index)) { const texture = new Texture(); texture.userData.pageIndex = index; this.pages.set(index, texture); } return this.pages.get(index); }; retain(keep: number[], visible: number[]) { retainedWindows.push({ keep, visible }); } dispose() {} sizes = () => [];
  } };
});

describe("reader runtime scheduling without a browser", () => {
  afterEach(() => { retainedWindows.length = 0; textureBudgets.length = 0; coverRequests.paused = false; coverRequests.calls.length = 0; bufferFault.armed = false; bufferFault.reject = undefined; failedPages.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it.each([320, 390, 1050, 1440])("loops repeatedly without an empty face at %s pixels", async initialWidth => {
    let width = initialWidth, height = 844, now = 0, nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    class Canvas extends EventTarget {
      get clientWidth() { return width; } get clientHeight() { return height; }
      setAttribute() {} remove() {} getContext() { return { fillRect() {} }; }
      getBoundingClientRect() { return { left: 0, top: 0, width, height }; }
    }
    const host = Object.assign(new EventTarget(), { dataset: {} as Record<string, string>, append() {}, getBoundingClientRect: () => ({ width, height }) });
    Object.defineProperties(host, { clientWidth: { get: () => width }, clientHeight: { get: () => height } });
    vi.stubGlobal("devicePixelRatio", 2); vi.stubGlobal("document", { createElement: () => new Canvas() });
    vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++nextFrame, cb); return nextFrame; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const flush = () => { for (let i = 0; i < 40; i++) { now += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(now)); } };
    const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
    const second = { ...fixtureIssue, id: "second-loop", slug: "second-loop" };
    const { createReader } = await import("../client/src/garments/runtime");
    const reader = createReader(host as any, [fixtureIssue, second], { status() {}, selected() {}, closed() {}, fallback() {} });
    const single = initialWidth < 900;
    try {
      await reader.select(fixtureIssue.slug); flush(); await drain();
      for (let circuit = 0; circuit < 2; circuit++) {
        const order = single ? [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0] : [1,2,3,4,5,6,8,9,10,11,12,13,14,0];
        for (const expected of order) {
          reader.command("next"); await drain(); flush(); await drain();
          expect(host.dataset.mode).toBe("reading");
          expect(host.dataset.page).toBe(String(expected));
          expect(rendered.pageFrames.at(-1)?.["garments-resting-artwork"]).toBe(expected);
        }
        expect(retainedWindows.at(-1)?.keep).toContain(15);
        expect(retainedWindows.at(-1)?.keep).toContain(0);
        if (!single) {
          expect(rendered.pageFrames.at(-1)?.["garments-resting-paper-reverse"]).toBe(15);
          expect(retainedWindows.at(-1)?.visible).toEqual([0, 15]);
        }
      }
      reader.command("previous"); await drain(); flush(); await drain();
      expect(host.dataset.page).toBe(single ? "15" : "14");
      if (single) {
        // Rotating the final phone closing page into a desktop spread must
        // reveal the first cover immediately, rather than an empty right side.
        width = 1440; reader.resize(); flush(); await drain();
        expect(host.dataset.page).toBe("0");
        expect(rendered.pageFrames.at(-1)).toMatchObject({ "garments-resting-paper-reverse": 15, "garments-resting-artwork": 0 });
      }
    } finally { reader.dispose(); }
  });
  it("prioritizes only visible thumbnails before revealing a stocked phone shelf", async () => {
    let width = 390, height = 732;
    class Canvas extends EventTarget {
      get clientWidth() { return width; } get clientHeight() { return height; }
      setAttribute() {} remove() {} getContext() { return { fillRect() {} }; }
      getBoundingClientRect() { return { left: 0, top: 0, width, height }; }
    }
    const host = Object.assign(new EventTarget(), { dataset: {} as Record<string, string>, append() {}, getBoundingClientRect: () => ({ width, height }) });
    Object.defineProperties(host, { clientWidth: { get: () => width }, clientHeight: { get: () => height } });
    vi.stubGlobal("devicePixelRatio", 2); vi.stubGlobal("document", { createElement: () => new Canvas() });
    vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", () => 1); vi.stubGlobal("cancelAnimationFrame", () => {});
    coverRequests.paused = true;
    const issues = Array.from({ length: 12 }, (_, index) => ({ ...fixtureIssue, id: `study-${index}`, slug: `study-${index}`, cover: { ...fixtureIssue.cover, image: `/large-${index}.webp`, thumbnail: `/thumb-${index}.webp` } }));
    const { createReader } = await import("../client/src/garments/runtime");
    const reader = createReader(host as any, issues, { status() {}, selected() {}, closed() {}, fallback() {} });
    try {
      expect(coverRequests.calls).toHaveLength(4);
      expect(coverRequests.calls.map(call => call.image).sort()).toEqual(["/thumb-0.webp", "/thumb-1.webp", "/thumb-2.webp", "/thumb-3.webp"]);
      expect(coverRequests.calls.every(call => call.height === 1024)).toBe(true);
      expect(host.dataset.entrance).toBe("loading");
      coverRequests.calls.slice(0, 3).forEach(call => call.release());
      for (let i = 0; i < 12; i++) await Promise.resolve();
      expect(host.dataset.entrance).toBe("loading");
      expect(coverRequests.calls).toHaveLength(4);
      coverRequests.calls[3].release();
      for (let i = 0; i < 18; i++) await Promise.resolve();
      expect(host.dataset.entrance).toBe("revealing");
      expect(host.dataset.coversLoaded).toBe("4");
      // Two offscreen thumbnails plus paper can now warm; none is required
      // to display or select the already complete shelf.
      expect(coverRequests.calls.filter(call => call.image.startsWith("/thumb-"))).toHaveLength(6);
      expect(coverRequests.calls.some(call => call.image.startsWith("/large-"))).toBe(false);
      coverRequests.paused = false; coverRequests.calls.forEach(call => call.release());
      width = 1512; height = 430;
      Object.assign(window, { innerHeight: 900 }); reader.resize();
      await reader.select(issues[0].slug);
      // This shelf alone would classify as single-page; the opened desktop
      // reader must nevertheless receive full detail for its taller viewport.
      expect(textureBudgets.at(-1)).toBe(2048);
    } finally { reader.dispose(); coverRequests.calls.forEach(call => call.release()); }
  });
  it.each([false, true])("coalesces drag meshes and preserves navigation with onboarding enabled=%s", async onboarding => {
    let width = 390, height = 732, visualScale = 1, now = 0, nextFrame = 0;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const frames = new Map<number, FrameRequestCallback>();
    const context = { fillStyle: "", fillRect() {} };
    class Canvas extends EventTarget {
      get clientWidth() { return width; } get clientHeight() { return height; }
      capture = new Set<number>();
      setAttribute() {} remove() {} getContext() { return context; }
      getBoundingClientRect() { return { left: 0, top: 0, width, height }; }
      setPointerCapture(id: number) { this.capture.add(id); }
      hasPointerCapture(id: number) { return this.capture.has(id); }
      releasePointerCapture(id: number) { this.capture.delete(id); }
    }
    let canvas: Canvas;
    const host = Object.assign(new EventTarget(), { dataset: {} as Record<string, string>, append(c: Canvas) { canvas = c; }, getBoundingClientRect: () => ({ width: width * visualScale, height: height * visualScale }) });
    Object.defineProperties(host, { clientWidth: { get: () => width }, clientHeight: { get: () => height } });
    rendered.mode = () => host.dataset.mode;
    vi.stubGlobal("devicePixelRatio", 2);
    vi.stubGlobal("document", { createElement: () => new Canvas() });
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++nextFrame, cb); return nextFrame; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const flush = (count = 1) => {
      for (let i = 0; i < count; i++) { now += 16; const callbacks = Array.from(frames.values()); frames.clear(); callbacks.forEach(cb => cb(now)); }
    };
    const drainLoads = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
    let acknowledgeHint = true;
    const centreTap = vi.fn(), hint = vi.fn(value => { if (value && acknowledgeHint) host.dispatchEvent(new Event("garments:hint-visible")); }); let currentZoom = 1; let lastError: string | null = null;
    const { createReader } = await import("../client/src/garments/runtime");
    const secondIssue = { ...fixtureIssue, id: "second-study", slug: "second-study" };
    const reader = createReader(host as any, [fixtureIssue, secondIssue], { status(s) { currentZoom = s.zoom; lastError = s.error; }, selected() {}, closed() {}, fallback() {}, centreTap, hint: onboarding ? hint : undefined });
    try {
      expect(host.dataset.entrance).toBe("loading");
      await drainLoads(); await drainLoads();
      expect(host.dataset.entrance).toBe("revealing");
      expect(host.dataset.coversLoaded).toBe("2");
      host.dispatchEvent(Object.assign(new Event("animationend"), { animationName: "garments-shelf-reveal" }));
      expect(host.dataset.entrance).toBe("ready");
      // Failed speculative pages never hold up opening the already loaded cover.
      failedPages.add(1);
      const flightStart = rendered.poses.length;
      await reader.select(fixtureIssue.slug); flush(10);
      const pickupFrames = rendered.poses.slice(flightStart).filter(frame => frame.mode === "selecting");
      expect(pickupFrames.length).toBeGreaterThan(1);
      expect(new Set(pickupFrames.map(frame => JSON.stringify(frame.camera))).size).toBe(1);
      visualScale = .25; reader.resize(); flush();
      expect(rendered.sizes.at(-1)).toEqual([width, height]);
      visualScale = 1; reader.resize(); flush();
      expect(host.dataset.entrance).toBe("ready");
      expect(host.dataset.mode).toBe("selecting");
      failedPages.clear();
      flush(60);
      expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
      const visibleFolds = () => {
        const folds: any[] = [];
        rendered.scene.traverse((mesh: any) => {
          if (!mesh.isMesh || !mesh.material.isMeshBasicMaterial || mesh.material.color.getHexString() !== "0b0b0b") return;
          for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
          folds.push(mesh);
        });
        return folds;
      };
      const { Vector3, Raycaster } = await import("three");
      const spineHit = () => {
        const fold = visibleFolds()[0];
        const point = new Vector3().applyMatrix4(fold.matrixWorld).project(rendered.camera);
        const ray = new Raycaster(); ray.setFromCamera({ x: point.x, y: point.y }, rendered.camera);
        const surfaces: any[] = [];
        fold.parent.traverse((mesh: any) => {
          if (!mesh.isMesh) return;
          for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
          mesh.geometry.computeBoundingSphere(); surfaces.push(mesh);
        });
        return ray.intersectObjects(surfaces, false)[0]?.object;
      };
      // Phone pages and desktop spreads share a black fold, never a white spine.
      expect(visibleFolds()).toHaveLength(1);
      expect(rendered.foldWidths.at(-1)).toBeCloseTo(6, 6);
      expect(visibleFolds()[0].material.depthTest).toBe(true);
      expect(visibleFolds()[0].material.depthWrite).toBe(true);
      expect(visibleFolds()[0].renderOrder).toBe(0);
      expect(reader.metrics().deformationCount).toBe(0);
      if (onboarding) {
        host.dispatchEvent(Object.assign(new Event("garments:viewport"), { detail: true }));
        await vi.advanceTimersByTimeAsync(400); flush(40);
        expect(hint).not.toHaveBeenCalled();
        acknowledgeHint = false;
        host.dispatchEvent(Object.assign(new Event("garments:viewport"), { detail: false }));
        await vi.advanceTimersByTimeAsync(100); flush(40);
        expect(hint).toHaveBeenLastCalledWith({ x: expect.any(Number), y: expect.any(Number) });
        await vi.advanceTimersByTimeAsync(1500); flush();
        expect(Number(host.dataset.progress)).toBe(0);
        acknowledgeHint = true; host.dispatchEvent(new Event("garments:hint-visible")); flush(40);
        expect(reader.metrics().deformationCount).toBeGreaterThan(0);
        expect(Number(host.dataset.progress)).toBeCloseTo(.16);
        expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
        await vi.advanceTimersByTimeAsync(600); flush(20);
        expect(Number(host.dataset.progress)).toBeCloseTo(0);
        await vi.advanceTimersByTimeAsync(620); flush(25);
        expect(Number(host.dataset.progress)).toBeCloseTo(.16);
        await vi.advanceTimersByTimeAsync(600); flush(20);
        expect(Number(host.dataset.progress)).toBeCloseTo(0);
        await vi.advanceTimersByTimeAsync(320); flush();
        expect(hint).toHaveBeenLastCalledWith(null);
        expect(reader.metrics().turn).toBeNull(); expect(host.dataset.page).toBe("0");
      }
      reader.command("previous"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("15");
      reader.command("next"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("0");
      rendered.pageFrames.length = 0;
      rendered.foldWidths.length = 0;
      reader.command("next"); await drainLoads(); flush(30);
      expect(host.dataset.page).toBe("1");
      const firstCurl = rendered.pageFrames.filter(frame => frame["garments-turn-paper-reverse"]);
      expect(firstCurl.length).toBeGreaterThan(0);
      expect(firstCurl.every(frame => frame["garments-turn-paper-reverse"] === "paper" && frame["garments-resting-artwork"] === 1)).toBe(true);
      expect(rendered.pageFrames.at(-1)?.["garments-resting-artwork"]).toBe(1);
      expect(reader.metrics().deformationCount).toBeGreaterThan(0);
      reader.command("next"); await drainLoads(); flush(40); expect(host.dataset.page).toBe("2");
      const pointer = (name: string, x: number, y = height / 2) => {
        const event = new Event(name); Object.assign(event, { clientX: x, clientY: y, button: 0, pointerType: "touch", pointerId: 1 }); canvas!.dispatchEvent(event);
      };
      const swipe = (forward: boolean, cancel = false) => {
        pointer("pointerdown", forward ? 375 : 15);
        now += 1000;
        pointer("pointermove", forward ? 15 : 375);
        flush();
        expect(visibleFolds()).toHaveLength(1);
        pointer(cancel ? "pointercancel" : "pointerup", forward ? 15 : 375);
        flush(40);
        expect(visibleFolds()).toHaveLength(1);
      };
      // Crossing an odd face must show the even face (including a chapter cover),
      // not turn another whole sheet and skip it. Index changes only on completion.
      for (let page = 3; page <= 7; page++) {
        const before = reader.metrics().deformationCount;
        swipe(true); expect(host.dataset.page).toBe(String(page));
        expect(reader.metrics().deformationCount).toBeGreaterThan(before);
      }
      swipe(true, true); expect(host.dataset.page).toBe("7");
      pointer("pointerdown", 375); now += 1000; pointer("pointermove", 15); flush();
      expect(host.dataset.page).toBe("7");
      pointer("pointerup", 15); flush(40);
      expect(host.dataset.page).toBe("8"); expect(host.dataset.slug).toBe(secondIssue.slug);
      swipe(true); expect(host.dataset.page).toBe("9");
      reader.command("next"); await drainLoads(); flush(2);
      expect(host.dataset.mode).toBe("settling");
      expect(visibleFolds()).toHaveLength(1);
      pointer("pointerdown", 375); pointer("pointerup", 375);
      pointer("pointerdown", 375); pointer("pointerup", 375);
      for (let i = 0; i < 3; i++) { flush(25); await drainLoads(); }
      expect(host.dataset.page).toBe("12");
      // Backward turns return the previous artwork around the same left spine,
      // with the current artwork underneath until the returning sheet lands.
      pointer("pointerdown", 15); now += 1000; pointer("pointermove", 190); flush();
      expect(reader.metrics().turn).toMatchObject({ front: 11, right: 12, direction: "backward" });
      const backwardMesh = rendered.scene.getObjectByName("garments-turn-artwork");
      const backwardPositions = backwardMesh.geometry.attributes.position;
      for (let vertex = 0; vertex < backwardPositions.count; vertex += 97) {
        expect(backwardPositions.getX(vertex)).toBeCloseTo(0, 6);
        expect(backwardPositions.getZ(vertex)).toBeCloseTo(.013, 6);
      }
      expect(rendered.pageFrames.at(-1)?.["garments-turn-artwork"]).toBe(11);
      expect(rendered.pageFrames.at(-1)?.["garments-resting-artwork"]).toBe(12);
      pointer("pointercancel", 190); flush(40); expect(host.dataset.page).toBe("12");
      for (let i = 0; i < 3; i++) swipe(false);
      expect(host.dataset.page).toBe("9");
      swipe(false); expect(host.dataset.page).toBe("8");
      swipe(false); expect(host.dataset.page).toBe("7"); expect(host.dataset.slug).toBe(fixtureIssue.slug);
      for (let page = 6; page >= 2; page--) {
        swipe(false); expect(host.dataset.page).toBe(String(page));
      }
      pointer("pointerdown", 375); expect(host.dataset.mode).toBe("reading");
      flush(); const before = reader.metrics().deformationCount;
      for (let i = 0; i < 100; i++) pointer("pointermove", 374 - i);
      expect(reader.metrics().deformationCount).toBe(before);
      expect(host.dataset.mode).toBe("dragging");
      flush(); expect(reader.metrics().deformationCount).toBe(before + 1);
      pointer("pointercancel", 275); flush(25);
      expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("2");
      width = 1440; height = 888; reader.resize(); flush();
      expect(host.dataset.page).toBe("2"); expect(host.dataset.mode).toBe("reading");
      expect(visibleFolds()).toHaveLength(1);
      expect(rendered.foldWidths.every(value => Math.abs(value - 6) < .000001)).toBe(true);
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2);
      await vi.advanceTimersByTimeAsync(300); expect(centreTap).toHaveBeenCalledTimes(1); expect(host.dataset.page).toBe("2");
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2); now += 100;
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2); flush(20);
      expect(currentZoom).toBe(1);
      reader.command("next"); await drainLoads(); flush(30);
      expect(host.dataset.page).toBe("3");
      const returnStart = rendered.poses.length;
      reader.command("close"); flush(60); expect(host.dataset.mode).toBe("browsing");
      expect(rendered.camera.position.y).toBeCloseTo(.07);
      const returnFrames = rendered.poses.slice(returnStart).filter(frame => frame.mode === "returning");
      expect(returnFrames.length).toBeGreaterThan(1);
      expect(new Set(returnFrames.map(frame => JSON.stringify(frame.camera))).size).toBe(1);
      await reader.select(fixtureIssue.slug); flush(40);
      rendered.foldWidths.length = 0;
      if (onboarding) { await vi.advanceTimersByTimeAsync(300); flush(40); expect(reader.metrics().turn).not.toBeNull(); }
      const coverEdge = width / 2 + Number(host.dataset.pageWidthPixels) / 2 - 5;
      pointer("pointerdown", coverEdge); expect(host.dataset.mode).toBe("reading");
      if (onboarding) { expect(hint).toHaveBeenLastCalledWith(null); expect(reader.metrics().turn).toBeNull(); }
      pointer("pointermove", coverEdge - 100); expect(host.dataset.mode).toBe("dragging"); flush();
      expect(visibleFolds()).toHaveLength(1);
      expect(spineHit()).toBe(visibleFolds()[0]);
      pointer("pointermove", coverEdge - Number(host.dataset.pageWidthPixels) * .70); flush();
      // The continuous binding stays behind the uncut sheet. Paper crossing
      // the crease must cover it naturally, without a black line through text.
      expect(visibleFolds()).toHaveLength(1);
      expect(spineHit()).not.toBe(visibleFolds()[0]);
      const turningPaper = spineHit();
      expect(turningPaper.name).toMatch(/^garments-turn-/);
      expect(turningPaper.material.clippingPlanes).toBeNull();
      pointer("pointercancel", coverEdge - 100); flush(30);
      expect(host.dataset.page).toBe("0");
      expect(visibleFolds()).toHaveLength(1);
      expect(rendered.foldWidths.length).toBeGreaterThan(0);
      expect(rendered.foldWidths.every(value => Math.abs(value - 6) < .000001)).toBe(true);
      // Framing follows the held first turn. Releasing a fully turned cover
      // cannot introduce a second sideways movement or camera refit.
      pointer("pointerdown", coverEdge);
      pointer("pointermove", coverEdge - Number(host.dataset.pageWidthPixels) * 3); flush();
      const heldFold = new Vector3().applyMatrix4(visibleFolds()[0].matrixWorld).project(rendered.camera).x;
      const heldCamera = rendered.camera.position.clone();
      expect(heldFold).toBeCloseTo(0, 6);
      expect(spineHit()).toBe(visibleFolds()[0]);
      pointer("pointerup", coverEdge - Number(host.dataset.pageWidthPixels) * 3); flush(40);
      expect(host.dataset.page).toBe("1");
      expect(new Vector3().applyMatrix4(visibleFolds()[0].matrixWorld).project(rendered.camera).x).toBeCloseTo(heldFold, 6);
      expect(rendered.camera.position.distanceTo(heldCamera)).toBeLessThan(.000001);
      reader.command("close"); flush(60);
      await reader.select(fixtureIssue.slug); flush(40);
      // Desktop's first curl and its resting spread show exactly the same next
      // artwork. The moving reverse and settled left page stay brown throughout.
      rendered.pageFrames.length = 0;
      reader.command("next"); await drainLoads(); flush(30);
      expect(host.dataset.page).toBe("1");
      const desktopCurl = rendered.pageFrames.filter(frame => frame["garments-turn-paper-reverse"]);
      expect(desktopCurl.length).toBeGreaterThan(0);
      expect(desktopCurl.every(frame => frame["garments-turn-paper-reverse"] === "paper" && frame["garments-resting-artwork"] === 1 && frame["garments-resting-paper-reverse"] === undefined)).toBe(true);
      expect(rendered.pageFrames.at(-1)?.["garments-resting-artwork"]).toBe(1);
      expect(rendered.pageFrames.at(-1)?.["garments-resting-paper-reverse"]).toBe("paper");
      reader.command("next"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("2");
      rendered.pageFrames.length = 0;
      reader.command("previous"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("1");
      expect(rendered.pageFrames.filter(frame => frame["garments-turn-paper-reverse"]).every(frame => frame["garments-turn-paper-reverse"] === "paper" && frame["garments-turn-artwork"] === 1)).toBe(true);
      expect(rendered.pageFrames.at(-1)?.["garments-resting-artwork"]).toBe(1);
      for (let index = 2; index <= 6; index++) { reader.command("next"); await drainLoads(); flush(30); }
      rendered.pageFrames.length = 0;
      reader.command("next"); await drainLoads(); flush(30);
      expect(host.dataset.page).toBe("8");
      const closingCurl = rendered.pageFrames.filter(frame => frame["garments-turn-paper-reverse"] !== undefined);
      expect(closingCurl.length).toBeGreaterThan(0);
      expect(closingCurl.every(frame => frame["garments-turn-paper-reverse"] === 7 && frame["garments-resting-artwork"] === 8)).toBe(true);
      expect(rendered.pageFrames.at(-1)).toMatchObject({ "garments-resting-paper-reverse": 7, "garments-resting-artwork": 8 });
      reader.command("previous"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("6");
      for (let index = 5; index >= 1; index--) { reader.command("previous"); await drainLoads(); flush(30); }
      reader.command("previous"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("0");
      // The final edition wraps to the first cover, with its closing page on
      // the left during every curl frame and in the settled spread.
      reader.command("previous"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("14");
      rendered.pageFrames.length = 0;
      reader.command("next"); await drainLoads(); flush(30); expect(host.dataset.page).toBe("0");
      const wrappedCurl = rendered.pageFrames.filter(frame => frame["garments-turn-paper-reverse"] !== undefined);
      expect(wrappedCurl.length).toBeGreaterThan(0);
      expect(wrappedCurl.every(frame => frame["garments-turn-paper-reverse"] === 15 && frame["garments-resting-artwork"] === 0)).toBe(true);
      expect(rendered.pageFrames.at(-1)).toMatchObject({ "garments-resting-paper-reverse": 15, "garments-resting-artwork": 0 });
      // A reversed, incomplete pull across the seam returns to the same spread.
      pointer("pointerdown", width / 2);
      pointer("pointermove", width / 2 - 90); flush();
      pointer("pointermove", width / 2 + 100); flush();
      pointer("pointerup", width / 2 + 100); flush(40);
      expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
      failedPages.add(1);
      reader.command("next"); await drainLoads(); flush(30);
      expect(host.dataset.mode).toBe("error"); expect(host.dataset.page).toBe("0");
      failedPages.clear();
      reader.command("retry"); await drainLoads(); await Promise.resolve(); flush(30);
      expect(host.dataset.mode).toBe("reading");
      reader.command("close"); flush(60); expect(host.dataset.mode).toBe("browsing");
      if (onboarding) {
        for (const dismiss of [() => reader.resize(), () => window.dispatchEvent(new Event("blur")), () => reader.command("close")]) {
          await reader.select(fixtureIssue.slug); flush(40);
          await vi.advanceTimersByTimeAsync(300); flush(40);
          expect(reader.metrics().turn).not.toBeNull();
          dismiss(); flush(60);
          expect(hint).toHaveBeenLastCalledWith(null); expect(reader.metrics().turn).toBeNull();
          reader.command("close"); flush(60);
          await vi.advanceTimersByTimeAsync(6000); flush();
          expect(host.dataset.mode).toBe("browsing");
        }
        await reader.select(fixtureIssue.slug); flush(40);
      }
      reader.command("close"); flush(60);
      await reader.select(fixtureIssue.slug); flush(40);
      bufferFault.armed = true;
      reader.command("next"); await drainLoads(); flush(30);
      expect(bufferFault.reject).toBeTypeOf("function");
      reader.command("close"); flush(60);
      bufferFault.reject!(new DOMException("signal is aborted without reason", "AbortError"));
      await drainLoads(); await Promise.resolve(); flush();
      expect(host.dataset.mode).toBe("browsing"); expect(lastError).toBeNull();
      bufferFault.armed = false;
      expect(reader.metrics().deformationCount).toBeLessThanOrEqual(reader.metrics().frameNumber);
    } finally { reader.dispose(); }
    const callsAfterDispose = hint.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(hint).toHaveBeenCalledTimes(callsAfterDispose);
  });
});
