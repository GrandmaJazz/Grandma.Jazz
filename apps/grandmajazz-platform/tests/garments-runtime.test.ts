import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureIssue } from "../client/src/garments/fixtures";
const { failedPages } = vi.hoisted(() => ({ failedPages: new Set<number>() }));

vi.mock("three", async original => {
  const actual = await original<typeof import("three")>();
  return { ...actual, TextureLoader: class { load() {} }, WebGLRenderer: class {
    domElement = document.createElement("canvas");
    shadowMap = {}; ratio = 1;
    capabilities = { maxTextureSize: 4096, getMaxAnisotropy: () => 8 };
    info = { render: { triangles: 0 }, memory: { textures: 0 } };
    setClearColor() {} setPixelRatio(value: number) { this.ratio = value; } getPixelRatio() { return this.ratio; }
    setSize() {} render(scene: any, camera: any) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); }
    getContext() { return { getExtension: () => null, getParameter: () => "unit-test renderer" }; }
    dispose() {}
  } };
});
vi.mock("../client/src/garments/textures", async () => {
  const { Texture } = await import("three");
  return { pageTexture: async () => new Texture(), PageTextures: class {
    texture = new Texture(); ensure = async (indices: number[]) => { if (indices.some(i => failedPages.has(i))) throw new Error("Page artwork could not be loaded"); }; get = () => this.texture; retain() {} dispose() {} sizes = () => [];
  } };
});

describe("reader runtime scheduling without a browser", () => {
  afterEach(() => { failedPages.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it.each([false, true])("coalesces drag meshes and preserves navigation with onboarding enabled=%s", async onboarding => {
    let width = 390, height = 732, now = 0, nextFrame = 0;
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
    const host = Object.assign(new EventTarget(), { dataset: {} as Record<string, string>, append(c: Canvas) { canvas = c; }, getBoundingClientRect: () => ({ width, height }) });
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
    let acknowledgeHint = true;
    const centreTap = vi.fn(), hint = vi.fn(value => { if (value && acknowledgeHint) host.dispatchEvent(new Event("garments:hint-visible")); }); let currentZoom = 1;
    const { createReader } = await import("../client/src/garments/runtime");
    const secondIssue = { ...fixtureIssue, id: "second-study", slug: "second-study" };
    const reader = createReader(host as any, [fixtureIssue, secondIssue], { status(s) { currentZoom = s.zoom; }, selected() {}, closed() {}, fallback() {}, centreTap, hint: onboarding ? hint : undefined });
    try {
      await reader.select(fixtureIssue.slug); flush(10);
      expect(host.dataset.mode).toBe("selecting");
      flush(60);
      expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
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
        expect(Number(host.dataset.progress)).toBeCloseTo(.18);
        expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
        await vi.advanceTimersByTimeAsync(4499);
        expect(hint).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1); flush(15);
        expect(Number(host.dataset.progress)).toBeGreaterThan(0);
        expect(Number(host.dataset.progress)).toBeLessThan(.18);
        await vi.advanceTimersByTimeAsync(500); flush();
        expect(hint).toHaveBeenLastCalledWith(null);
        expect(reader.metrics().turn).toBeNull(); expect(host.dataset.page).toBe("0");
      }
      reader.command("previous"); flush(30); expect(host.dataset.page).toBe("0");
      reader.command("next"); await Promise.resolve(); await Promise.resolve(); flush(30);
      expect(host.dataset.page).toBe("1");
      expect(reader.metrics().deformationCount).toBeGreaterThan(0);
      reader.command("next"); await Promise.resolve(); await Promise.resolve(); flush(40); expect(host.dataset.page).toBe("2");
      const pointer = (name: string, x: number, y = height / 2) => {
        const event = new Event(name); Object.assign(event, { clientX: x, clientY: y, button: 0, pointerType: "touch", pointerId: 1 }); canvas!.dispatchEvent(event);
      };
      const swipe = (forward: boolean, cancel = false) => {
        pointer("pointerdown", forward ? 375 : 15);
        now += 1000;
        pointer("pointermove", forward ? 15 : 375);
        flush();
        pointer(cancel ? "pointercancel" : "pointerup", forward ? 15 : 375);
        flush(40);
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
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2);
      await vi.advanceTimersByTimeAsync(300); expect(centreTap).toHaveBeenCalledTimes(1); expect(host.dataset.page).toBe("2");
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2); now += 100;
      pointer("pointerdown", width / 2); pointer("pointerup", width / 2); flush(20);
      expect(currentZoom).toBe(1);
      reader.command("next"); await Promise.resolve(); await Promise.resolve(); flush(30);
      expect(host.dataset.page).toBe("3");
      reader.command("close"); flush(60); expect(host.dataset.mode).toBe("browsing");
      await reader.select(fixtureIssue.slug); flush(40);
      if (onboarding) { await vi.advanceTimersByTimeAsync(300); flush(40); expect(reader.metrics().turn).not.toBeNull(); }
      const coverEdge = width / 2 + Number(host.dataset.pageWidthPixels) / 2 - 5;
      pointer("pointerdown", coverEdge); expect(host.dataset.mode).toBe("reading");
      if (onboarding) { expect(hint).toHaveBeenLastCalledWith(null); expect(reader.metrics().turn).toBeNull(); }
      pointer("pointermove", coverEdge - 100); expect(host.dataset.mode).toBe("dragging"); flush();
      pointer("pointercancel", coverEdge - 100); flush(30);
      expect(host.dataset.page).toBe("0");
      // Reverse a real forward curl into resistance at the archive start.
      pointer("pointerdown", width / 2);
      pointer("pointermove", width / 2 - 90); flush();
      pointer("pointermove", width / 2 + 100); flush();
      pointer("pointerup", width / 2 + 100); flush(40);
      expect(host.dataset.mode).toBe("reading"); expect(host.dataset.page).toBe("0");
      failedPages.add(1);
      reader.command("next"); await Promise.resolve(); await Promise.resolve(); flush(30);
      expect(host.dataset.mode).toBe("error"); expect(host.dataset.page).toBe("0");
      failedPages.clear();
      reader.command("retry"); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); flush(30);
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
      expect(reader.metrics().deformationCount).toBeLessThanOrEqual(reader.metrics().frameNumber);
    } finally { reader.dispose(); }
    const callsAfterDispose = hint.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(hint).toHaveBeenCalledTimes(callsAfterDispose);
  });
});
