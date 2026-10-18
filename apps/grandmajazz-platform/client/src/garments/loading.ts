// Start independent work together instead of waiting for React's route and
// manifest renders before downloading the renderer. Keep publication data fresh.
let scene: Promise<typeof import("./GarmentsScene")> | undefined;
let manifest: { archive: boolean; request: Promise<Response> } | undefined;
export const loadGarmentsScene = () => scene ??= import("./GarmentsScene");
export function loadGarmentsManifest(archive: boolean) {
  if (manifest?.archive === archive) {
    const request = manifest.request; manifest = undefined; return request;
  }
  return fetch(`/api/garments/issues${archive ? "?archive=1" : ""}`, { cache: "no-store" });
}
export function preloadGarments(path: string) {
  if (!/^\/garments(?:\/(?!manage(?:\/|$))|$)/.test(path)) return;
  const archive = /^\/garments\/archive(?:\/|$)/.test(path);
  manifest = { archive, request: fetch(`/api/garments/issues${archive ? "?archive=1" : ""}`, { cache: "no-store" }) };
  // Attach rejection handlers immediately; the mounted page owns retry/error UI.
  void manifest.request.catch(() => {});
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) void loadGarmentsScene().catch(() => {});
}
