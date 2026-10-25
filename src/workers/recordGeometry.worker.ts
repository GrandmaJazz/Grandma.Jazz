import * as THREE from 'three';
import { smoothPlatterGeometry } from '../lib/recordDetails';

self.onmessage = event => {
  try {
    const { attributes, index, matrix, vinyl } = event.data;
    const geometry = new THREE.BufferGeometry();
    for (const [key, value] of Object.entries(attributes) as [string, { array: Float32Array; itemSize: number }][]) {
      geometry.setAttribute(key, new THREE.BufferAttribute(value.array, value.itemSize));
    }
    if (index) geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const mesh = new THREE.Mesh(geometry);
    smoothPlatterGeometry(mesh, new THREE.Matrix4().fromArray(matrix), vinyl);
    const output = Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, value]) => [key, { array: value.array, itemSize: value.itemSize }]));
    const outputIndex = mesh.geometry.index!.array;
    const transfers = [...Object.values(output).map(value => value.array.buffer), outputIndex.buffer] as ArrayBuffer[];
    self.postMessage({ attributes: output, index: outputIndex }, { transfer: transfers });
  } catch (error) { self.postMessage({ error: String(error) }); }
};
