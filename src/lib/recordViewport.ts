import * as THREE from 'three';

/** Fit the complete deck below the mark, including on short landscape screens.
 * Work in camera space so perspective, aspect and the raised arm all count. */
export function fitRecordCamera(camera: THREE.PerspectiveCamera, box: THREE.Box3, width: number, height: number) {
  const portrait = height > width;
  camera.aspect = width / Math.max(1, height);
  camera.fov = 40;
  // Put the deck below the logo in portrait; centre it in short landscape.
  camera.setViewOffset(width, height, 0, portrait ? -height * .11 : 0, width, height);
  const target = box.getCenter(new THREE.Vector3());
  const direction = new THREE.Vector3(0, .55, .835).normalize();
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const place = (distance: number) => {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  };
  let low = box.getSize(new THREE.Vector3()).length() * .5;
  let high = low * 30;
  for (let i = 0; i < 28; i++) {
    const distance = (low + high) / 2;
    place(distance);
    const fits = corners.every(corner => {
      const p = corner.clone().project(camera);
      return Math.abs(p.x) <= .92 && p.y >= (portrait ? -.80 : -.84) && p.y <= (portrait ? .16 : .84) && p.z < 1;
    });
    if (fits) high = distance; else low = distance;
  }
  place(high);
  return target;
}
