import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { fixtureIssue } from "../client/src/garments/fixtures";
import { SessionArtwork, PageTextures } from "../client/src/garments/textures";

describe("bounded reading-session artwork", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
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
