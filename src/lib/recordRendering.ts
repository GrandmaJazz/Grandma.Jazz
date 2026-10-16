import * as THREE from 'three';

/** Match high-density phones without rendering a huge tablet/desktop buffer.
 * Keep this fixed for a sequence so detail never visibly changes mid-reveal. */
export function recordPixelRatio(width: number, height: number, deviceRatio: number) {
  const budget = width < 640 ? 3_200_000 : 6_000_000;
  return Math.max(1, Math.min(deviceRatio || 1, 3, Math.sqrt(budget / Math.max(1, width * height))));
}

export function filterRecordTexture(texture: THREE.Texture, maxAnisotropy: number) {
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, maxAnisotropy);
}

/** The restored platter lip extends beyond the deck. Keep the approved
 * close camera framing anchored to the deck, with the complete lip rendered. */
export function recordFramingBox(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  model.traverse(node => {
    if (node instanceof THREE.Mesh && !node.name.startsWith('Object035_Main_0')) box.expandByObject(node);
  });
  return box.isEmpty() ? new THREE.Box3().setFromObject(model) : box;
}

/** Both GLBs reference the same immutable image URLs. A local loader keeps
 * their decoded image and GPU texture alive through the needle/spin handoff,
 * without enabling a global Three cache or retaining them after the intro. */
export class SharedRecordTextureLoader extends THREE.TextureLoader {
  private entries = new Map<string, { texture: THREE.Texture; ready: Promise<THREE.Texture> }>();
  private owned = new WeakSet<THREE.Texture>();
  private disposed = false;

  override load(
    url: string,
    onLoad?: (texture: THREE.Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): THREE.Texture {
    let entry = this.entries.get(url);
    if (!entry) {
      let texture!: THREE.Texture;
      const ready = new Promise<THREE.Texture>((resolve, reject) => {
        texture = super.load(url, loaded => {
          if (this.disposed) { loaded.dispose(); reject(new Error('Record scene disposed')); }
          else resolve(loaded);
        }, onProgress, error => {
          this.entries.delete(url);
          texture.dispose();
          reject(error);
        });
      });
      entry = { texture, ready };
      this.entries.set(url, entry);
      this.owned.add(texture);
    }
    void entry.ready.then(onLoad, onError);
    return entry.texture;
  }

  owns(texture: THREE.Texture) { return this.owned.has(texture); }

  dispose() {
    this.disposed = true;
    for (const { texture } of this.entries.values()) texture.dispose();
    this.entries.clear();
  }
}
