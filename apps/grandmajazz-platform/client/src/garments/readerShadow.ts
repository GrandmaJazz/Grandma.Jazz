import * as THREE from "three";

const offset = new THREE.Vector3(-3, 5, 7);
const bounds = new THREE.Box3();
const point = new THREE.Vector3();

// Reserve the shadow map for the moving publication, rather than the whole
// cabinet. Keep its bounds stable during the curl to avoid a crawling edge.
export function fitReaderShadow(light: THREE.DirectionalLight, group: THREE.Group, width: number, height: number) {
  group.updateWorldMatrix(true, false);
  light.target.position.copy(group.position);
  light.position.copy(group.position).add(offset);
  light.updateMatrixWorld(); light.target.updateMatrixWorld();
  light.shadow.updateMatrices(light);
  const camera = light.shadow.camera;
  bounds.makeEmpty();
  for (const x of [-width * 1.2, width * 1.2]) for (const y of [-height * .65, height * .65]) for (const z of [-.08, width * .95]) {
    point.set(x, y, z).applyMatrix4(group.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    bounds.expandByPoint(point);
  }
  Object.assign(camera, { left: bounds.min.x - .04, right: bounds.max.x + .04, bottom: bounds.min.y - .04, top: bounds.max.y + .04,
    near: Math.max(.1, -bounds.max.z - .2), far: -bounds.min.z + .3 });
  camera.updateProjectionMatrix();
}
