import * as THREE from 'three';

export const FLIGHT_DURATION = 9;
export const NEEDLE_START = .25;
export const NEEDLE_DURATION = 3.75;
const clamp = THREE.MathUtils.clamp;
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Camera-only prototype. Source-space coordinates leave all model tracks intact. */
export function createRecordCameraFlight(width: number, height: number, center: THREE.Vector3, size: THREE.Vector3) {
  const phone = width < 640;
  const portrait = phone && height > width;
  const targetY = phone ? -1.8 : width < 1025 ? -.85 : width < 1440 ? -.5 : -.2;
  const offset = new THREE.Vector3(.05, targetY, 0);
  const endPosition = center.clone().add(new THREE.Vector3(0, size.y * (portrait ? 3.3 : phone ? 2 : 2.5), size.z * 2.5)).sub(offset);
  const endTarget = center.clone().add(new THREE.Vector3(0, phone ? -.5 : 0, 0)).sub(offset);
  const endFov = portrait
    ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(40) / 2) * (390 / 760) / (width / height)))
    : phone ? 50 : width < 768 ? 40 : width < 1025 ? 30 : width < 1440 ? 25 : 20;
  // Anchor the logo to the projected back edge, so the vinyl overlaps its
  // lower border by a few CSS pixels, allowing for the asset’s inset border.
  const restingCamera = new THREE.PerspectiveCamera(endFov, width / height, .04, 30);
  restingCamera.position.copy(endPosition); restingCamera.lookAt(endTarget);
  if (portrait) restingCamera.setViewOffset(width, height, 0, height * .24, width, height);
  restingCamera.updateProjectionMatrix(); restingCamera.updateMatrixWorld(true);
  let recordTop = height;
  for (let i = 0; i < 256; i++) {
    const angle = i / 256 * Math.PI * 2;
    const edge = new THREE.Vector3(1.6501203 + .7293508 * Math.cos(angle), .663, 2.0307182 + .7293508 * Math.sin(angle)).project(restingCamera);
    recordTop = Math.min(recordTop, (1 - edge.y) * height / 2);
  }
  const logoBottom = recordTop + 9;
  // One straight dolly out: no orbit, sideways detour or reversing spline.
  // Start just above the grooves while the cartridge crosses overhead.
  const startPosition = new THREE.Vector3(2.20, .77, 3.05);
  const startTarget = new THREE.Vector3(2.20, .77, 2.47);
  return (seconds: number) => {
    const progress = clamp(seconds / FLIGHT_DURATION, 0, 1);
    const travel = smooth(progress) ** 2;
    const reveal = smooth((progress - .62) / .38);
    return {
      logoBottom,
      position: startPosition.clone().lerp(endPosition, travel), target: startTarget.clone().lerp(endTarget, travel),
      fov: THREE.MathUtils.lerp(portrait ? 58 : 42, endFov, reveal),
      viewOffset: portrait ? .24 * reveal : 0,
      logoOpacity: smooth((progress - .68) / .27),
      exposure: THREE.MathUtils.lerp(.52, .4, reveal),
      needleTime: clamp((seconds - NEEDLE_START) / NEEDLE_DURATION, 0, 1) * 3.75,
      spinTime: Math.max(0, seconds - NEEDLE_START - NEEDLE_DURATION),
      chapter: seconds < 4 ? 'Under the needle' : seconds < 8 ? 'The record comes alive' : 'The first note',
    };
  };
}
