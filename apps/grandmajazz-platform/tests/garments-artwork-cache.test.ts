import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { fixtureIssue } from "../client/src/garments/fixtures";
import { SessionArtwork, PageTextures } from "../client/src/garments/textures";

describe("bounded reading-session artwork", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function imageEnvironment(width = 3000, height = 4000) {
    const allocate = vi.fn(() => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }) }));
    vi.stubGlobal("document", { createElement: allocate });
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("Image", class {
      width = width; height = height; onload?: () => void;
      set src(url: string) { if (url) queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["compressed-artwork"]))));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:artwork");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    return allocate;
  }
  it("caps zoom textures at the source detail and reuses that completed resolution", async () => {
    const allocate = imageEnvironment(1500, 2000);
    const issue = { ...fixtureIssue, width: 1500, height: 2000 };
    const store = new PageTextures(issue, [{ ...issue.cover, fixture: undefined, image: "/native.webp" }], 2048, 8);
    await store.ensure([0], 4096);
    expect(store.sizes()).toEqual([{ index: 0, width: 1500, height: 2000 }]);
    await store.ensure([0], 4096);
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.memory().rgbaBytes).toBe(12_000_000);
    store.dispose(); expect(store.memory()).toMatchObject({ pages: 0, rgbaBytes: 0, encodedBytes: 0 });
  });
  it("deduplicates concurrent neighbour previews without disposing the shared live texture", async () => {
    const allocate = imageEnvironment();
    const store = new PageTextures(fixtureIssue, [{ ...fixtureIssue.cover, fixture: undefined, image: "/large.webp", thumbnail: "/preview.webp" }], 2048, 8);
    const dispose = vi.spyOn(THREE.Texture.prototype, "dispose");
    await Promise.all([store.ensurePreview([0, 0]), store.ensurePreview([0])]);
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.sizes()[0].height).toBe(1024);
    expect(dispose).not.toHaveBeenCalled(); store.dispose();
  });
  it("keeps six adjacent pages ready using previews and releases the decoded window", async () => {
    imageEnvironment();
    const pages = Array.from({ length: 12 }, (_, index) => ({ ...fixtureIssue.cover, fixture: undefined, image: `/page-${index}.webp`, thumbnail: `/thumb-${index}.webp` }));
    const store = new PageTextures(fixtureIssue, pages, 2048, 8);
    const keep = [2, 3, 4, 5, 6, 7]; store.retain(keep, [4]);
    await store.ensurePreview(keep);
    const old = store.get(4)!; const dispose = vi.spyOn(old, "dispose");
    await store.ensure([4]);
    expect(dispose).not.toHaveBeenCalled();
    store.releaseRetired(); expect(dispose).toHaveBeenCalledOnce();
    expect(store.sizes()).toHaveLength(6);
    expect(store.sizes().filter(page => page.height === 1024)).toHaveLength(5);
    expect(store.get(4)?.image.height).toBe(2048);
    expect(store.memory().rgbaBytes).toBeLessThan(28 * 1024 * 1024);
    store.retain([4]); expect(store.memory().pages).toBe(1);
    store.dispose(); expect(store.memory().rgbaBytes).toBe(0);
  });
  it.each(["ensure", "ensurePreview"] as const)("rejects late %s textures after the reader moves its window", async method => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }) }) });
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("Image", class {
      width = 3000; height = 4000; onload?: () => void;
      set src(url: string) { if (url) queueMicrotask(() => this.onload?.()); }
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:late-page");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    const pages = [0, 1].map(index => ({ ...fixtureIssue.cover, fixture: undefined, image: `/page-${index}.webp`, thumbnail: `/thumb-${index}.webp` }));
    const store = new PageTextures(fixtureIssue, pages, 2048, 8);
    const loading = store[method]([0]);
    store.retain([1]);
    finish(new Response(new Blob(["late-page"])));
    await loading;
    expect(store.get(0)).toBeUndefined();
    expect(store.sizes()).toHaveLength(0);
    store.dispose();
  });
  it("opens a cloned shelf cover without waiting for downloads or owning the shelf texture", async () => {
    const shelf = new THREE.Texture({ width: 1536, height: 2048 } as any);
    const dispose = vi.spyOn(shelf, "dispose");
    const store = new PageTextures(fixtureIssue, [{ ...fixtureIssue.cover, image: "/cover.webp", fixture: undefined }], 2048, 8);
    store.seed(0, shelf);
    expect(store.get(0)).not.toBe(shelf);
    expect(store.get(0)?.image).toBe(shelf.image);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await store.ensureAvailable([0]);
    expect(fetcher).not.toHaveBeenCalled();
    // A large preview canvas still upgrades from the actual reading artwork.
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }) }) });
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("Image", class {
      width = 3000; height = 4000; onload?: () => void; onerror?: () => void;
      set src(url: string) { if (url) queueMicrotask(() => this.onload?.()); }
    });
    fetcher.mockResolvedValue(new Response(new Blob(["full-page"])));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:full-page");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    await store.ensure([0]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(store.get(0)?.image).not.toBe(shelf.image);
    store.dispose(); expect(dispose).not.toHaveBeenCalled();
  });
  it("shares downloads, reuses compressed pages, and releases the session", async () => {
    const fetcher = vi.fn(async () => new Response(new Blob(["art"])));
    vi.stubGlobal("fetch", fetcher);
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:page");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const artwork = new SessionArtwork(new AbortController().signal);
    expect(await Promise.all([artwork.source("/one"), artwork.source("/one")])).toEqual(["blob:page", "blob:page"]);
    expect(await artwork.source("/one")).toBe("blob:page");
    expect(fetcher).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1);
    artwork.dispose(); expect(revoke).toHaveBeenCalledWith("blob:page");
    await expect(artwork.source("/one")).rejects.toThrow("cancelled");
  });
  it("evicts the least recently used encoded source within the memory budget", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["1234"]))));
    let serial = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:${++serial}`);
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const artwork = new SessionArtwork(new AbortController().signal, 8);
    await artwork.source("/one"); await artwork.source("/two"); await artwork.source("/one"); await artwork.source("/three");
    expect(revoke).toHaveBeenCalledWith("blob:2");
    expect(await artwork.source("/one")).toBe("blob:1");
    artwork.dispose(); expect(revoke).toHaveBeenCalledWith("blob:1"); expect(revoke).toHaveBeenCalledWith("blob:3");
  });
  it("rejects unavailable and cancelled artwork without retaining object URLs", async () => {
    const abort = new AbortController();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:page");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 404 })));
    await expect(new SessionArtwork(abort.signal).source("/missing")).rejects.toThrow("could not be loaded");
    abort.abort();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["art"]))));
    await expect(new SessionArtwork(abort.signal).source("/one")).rejects.toThrow("cancelled");
    expect(create).not.toHaveBeenCalled();
  });
});
