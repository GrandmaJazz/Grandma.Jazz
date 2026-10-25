import * as THREE from 'three';

/** Preserve the full 24-way surface refinement without blocking the loader. */
export async function prepareRecordGeometry(model: THREE.Object3D) {
  if (typeof Worker === 'undefined') return;
  let worker: Worker;
  try { worker = new Worker(new URL('../workers/recordGeometry.worker.ts', import.meta.url)); }
  catch { return; } // Full-detail local preparation remains available.
  model.updateMatrixWorld(true);
  try {
    for (const name of ['Object035_Main_0', 'Tube010__0']) {
      const mesh = model.getObjectByName(name) as THREE.Mesh | undefined;
      if (!mesh || mesh.userData.gjSmoothed) continue;
      const geometry = mesh.geometry;
      const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, { array: new Float32Array(value.array), itemSize: value.itemSize }]));
      const result: any = await new Promise((resolve, reject) => {
        worker.onmessage = event => event.data.error ? reject(new Error(event.data.error)) : resolve(event.data);
        worker.onerror = reject;
        worker.postMessage({ attributes, index: geometry.index ? new Uint32Array(geometry.index.array) : null,
          matrix: model.matrixWorld.clone().invert().multiply(mesh.matrixWorld).toArray(), vinyl: name === 'Tube010__0' });
      });
      const smooth = new THREE.BufferGeometry();
      for (const [key, value] of Object.entries(result.attributes) as [string, { array: Float32Array; itemSize: number }][]) {
        smooth.setAttribute(key, new THREE.BufferAttribute(value.array, value.itemSize));
      }
      smooth.setIndex(new THREE.BufferAttribute(result.index, 1));
      smooth.computeBoundingBox(); smooth.computeBoundingSphere();
      mesh.geometry = smooth;
      mesh.userData.gjSmoothed = true;
      geometry.dispose();
    }
  } catch (error) {
    // Keep full-detail synchronous preparation available if a browser blocks
    // workers. addRecordDetails finishes any mesh not already prepared.
    console.warn('Record geometry worker unavailable; preparing locally.', error);
  } finally { worker.terminate(); }
}
