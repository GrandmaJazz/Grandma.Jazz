import * as THREE from 'three';

/** GLTF attributes can share an interleaved buffer: read logical components,
 * including stride, offset and normalization, before crossing the worker boundary. */
export function recordGeometryAttributes(geometry: THREE.BufferGeometry) {
  return Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => {
    const array = new Float32Array(value.count * value.itemSize);
    for (let i = 0; i < value.count; i++) {
      for (let c = 0; c < value.itemSize; c++) array[i * value.itemSize + c] = value.getComponent(i, c);
    }
    return [key, { array, itemSize: value.itemSize }];
  }));
}
