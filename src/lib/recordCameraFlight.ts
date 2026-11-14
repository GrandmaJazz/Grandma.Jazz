import * as THREE from 'three';

export const FLIGHT_DURATION = 9;
export const NEEDLE_START = .25;
export const NEEDLE_DURATION = 3.75;
const LOGO_FADE_START = 2;
const SPIN_STOP_TIME = FLIGHT_DURATION - .12;
const SPIN_BRAKE_DURATION = 1.5;
const SPIN_BRAKE_START = SPIN_STOP_TIME - SPIN_BRAKE_DURATION;
const clamp = THREE.MathUtils.clamp;
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Camera-only prototype. Source-space coordinates leave all model tracks intact. */
export function createRecordCameraFlight(width: number, height: number, center: THREE.Vector3, size: THREE.Vector3) {
  const phone = width < 640;
  const portrait = phone && height > width;
  const targetY = phone ? -1.8 : width < 1025 ? -.85 : width < 1440 ? -.5 : -.2;
  const offset = new THREE.Vector3(portrait ? .13 : .05, targetY, 0);
  const endPosition = center.clone().add(new THREE.Vector3(0, size.y * (portrait ? 3.3 : phone ? 2 : 2.5), size.z * 2.5)).sub(offset);
  const endTarget = center.clone().add(new THREE.Vector3(0, phone ? -.5 : 0, 0)).sub(offset);
  const endFov = portrait
    ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(40) / 2) * (390 / 760) * 1.19 / (width / height)))
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
  const logoClearance = clamp(height * .04, 12, 28);
  const logoBottom = clamp(recordTop + 5, logoClearance * 2, height - logoClearance);
  const logoWidth = Math.min(width * (phone ? .9 : .84), 1520, (logoBottom - logoClearance) * 2000 / 652);
  // One straight dolly out: no orbit, sideways detour or reversing spline.
  // Start just above the grooves while the cartridge crosses overhead.
  const startPosition = new THREE.Vector3(2.17, .715, 2.72);
  const startTarget = new THREE.Vector3(2.17, .68, 2.24);
  return (seconds: number) => {
    const progress = clamp(seconds / FLIGHT_DURATION, 0, 1);
    const travel = .18 * progress + .82 * smooth(progress) ** 2;
    const reveal = smooth((progress - .62) / .38);
    const pullback = portrait ? smooth((progress - .50) / .38) : reveal;
    const logoProgress = clamp((seconds - LOGO_FADE_START) / (FLIGHT_DURATION - LOGO_FADE_START), 0, 1);
    const braking = clamp((seconds - SPIN_BRAKE_START) / SPIN_BRAKE_DURATION, 0, 1);
    // Integrate a smoothstep slowdown so the spin keeps its position when seeking.
    const spinTime = clamp(seconds - NEEDLE_START - NEEDLE_DURATION, 0, SPIN_BRAKE_START - NEEDLE_START - NEEDLE_DURATION)
      + SPIN_BRAKE_DURATION * (braking - braking ** 3 + .5 * braking ** 4);
    return {
      logoBottom,
      logoWidth,
      position: startPosition.clone().lerp(endPosition, travel), target: startTarget.clone().lerp(endTarget, travel),
      fov: THREE.MathUtils.lerp(portrait ? 58 : 42, endFov, pullback),
      viewOffset: portrait ? .24 * reveal : 0,
      logoOpacity: smooth(logoProgress),
      logoScale: THREE.MathUtils.lerp(.76, 1, progress),
      exposure: THREE.MathUtils.lerp(.52, .4, reveal),
      needleTime: clamp((seconds - NEEDLE_START) / NEEDLE_DURATION, 0, 1) * 3.75,
      spinTime,
      chapter: seconds < 4 ? 'Under the needle' : seconds < 8 ? 'The record comes alive' : 'The first note',
    };
  };
}
