import * as THREE from 'three';

const GOLD = '#B49B73';
const CENTRE = new THREE.Vector2(1.6501203, 2.0307182);

/** Subdivide the original annular faces in polar space. Interpolated UVs keep
 * each original stud/normal-map island, while the silhouette becomes circular. */
export function smoothPlatterGeometry(mesh: THREE.Mesh, sourceMatrix: THREE.Matrix4, vinyl = false) {
  const geometry = mesh.geometry;
  const inverse = sourceMatrix.clone().invert();
  const attributes = Object.entries(geometry.attributes).filter(([name]) => name !== 'tangent');
  const data: Record<string, number[]> = Object.fromEntries(attributes.map(([name]) => [name, []]));
  const index = geometry.index;
  const count = index ? index.count : geometry.attributes.position.count;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map(k => index ? index.getX(i + k) : i + k);
    const points = ids.map(id => new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, id).applyMatrix4(sourceMatrix));
    const radii = points.map(p => Math.hypot(p.x - CENTRE.x, p.z - CENTRE.y));
    const curved = radii.every(r => r > (vinyl ? 0.01 : 0.70));
    const divisions = curved ? 8 : 1;
    const emit = (u: number, v: number) => {
      const weights = [1 - u - v, u, v];
      let projected: THREE.Vector3 | undefined;
      if (curved) {
        const p = new THREE.Vector3();
        points.forEach((point, k) => p.addScaledVector(point, weights[k]));
        const radius = radii.reduce((sum, r, k) => sum + r * weights[k], 0);
        const angle = Math.atan2(p.z - CENTRE.y, p.x - CENTRE.x);
        p.x = CENTRE.x + Math.cos(angle) * radius;
        p.z = CENTRE.y + Math.sin(angle) * radius;
        projected = p;
      }
      for (const [name, attr] of attributes) {
        if (name === 'position' && projected) {
          projected.clone().applyMatrix4(inverse).toArray(data[name], data[name].length);
        } else if (name === 'uv' && vinyl && projected) {
          // The record atlas is a planar projection. Reproject after curving
          // so the printed ring and grooves stay concentric, never scalloped.
          data[name].push(.5 + (projected.x - CENTRE.x) / 1.458702, .5 - (projected.z - CENTRE.y) / 1.458702);
        } else {
          for (let c = 0; c < attr.itemSize; c++) {
            data[name].push(ids.reduce((sum, id, k) => sum + attr.getComponent(id, c) * weights[k], 0));
          }
        }
      }
    };
    for (let u = 0; u < divisions; u++) for (let v = 0; v < divisions - u; v++) {
      emit(u / divisions, v / divisions);
      emit((u + 1) / divisions, v / divisions);
      emit(u / divisions, (v + 1) / divisions);
      if (u + v < divisions - 1) {
        emit((u + 1) / divisions, v / divisions);
        emit((u + 1) / divisions, (v + 1) / divisions);
        emit(u / divisions, (v + 1) / divisions);
      }
    }
  }
  const smooth = new THREE.BufferGeometry();
  for (const [name, attr] of attributes) smooth.setAttribute(name, new THREE.Float32BufferAttribute(data[name], attr.itemSize));
  // Indexed sequential vertices allow Three to recompute the tangent basis.
  smooth.setIndex(Array.from({ length: smooth.attributes.position.count }, (_, i) => i));
  smooth.normalizeNormals();
  if (smooth.hasAttribute('uv')) smooth.computeTangents();
  smooth.computeBoundingBox(); smooth.computeBoundingSphere();
  mesh.geometry = smooth;
  geometry.dispose();
}

function goldMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.34, metalness: 0.68, emissive: GOLD, emissiveIntensity: 0.055 });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      // Fine directional brushing, attenuated below a pixel to avoid shimmer.
      float gjBrushPhase = vViewPosition.y * 2600.0;
      float gjBrush = sin(gjBrushPhase) * exp(-fwidth(gjBrushPhase));
      roughnessFactor += gjBrush * 0.035;`);
  };
  material.customProgramCacheKey = () => 'gj-brushed-hardware-v1';
  return material;
}

function attachInSourceSpace(parent: THREE.Mesh, model: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
  geometry.applyMatrix4(parent.matrixWorld.clone().invert().multiply(model.matrixWorld));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.layers.mask = parent.layers.mask;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/** Continuous, finely tessellated trim. Add after framing; attach to the actual
 * hardware so animation, scene disposal and layers share the original lifetime. */
export function addRecordDetails(model: THREE.Object3D) {
  if (model.userData.gjFineDetails) return;
  model.userData.gjFineDetails = true;
  model.updateMatrixWorld(true);
  const lip = model.getObjectByName('Object035_Main_0') as THREE.Mesh | undefined;
  if (lip) {
    smoothPlatterGeometry(lip, model.matrixWorld.clone().invert().multiply(lip.matrixWorld));
    for (const [radius, y, name] of [[0.7368, 0.6565, 'upper'], [0.81865, 0.5506, 'lower']] as const) {
      // Opaque, untextured rubber trim covers the low-resolution atlas seam.
      // Preserve the studded sidewall between the two seams.
      const ring = new THREE.TorusGeometry(radius, 0.006, 8, 512);
      ring.rotateX(-Math.PI / 2).translate(CENTRE.x, y, CENTRE.y);
      attachInSourceSpace(lip, model, ring, new THREE.MeshStandardMaterial({ color: '#080808', roughness: .85, metalness: 0 }), `gj-continuous-${name}-ring`);
    }
  }
  const vinyl = model.getObjectByName('Tube010__0') as THREE.Mesh | undefined;
  if (vinyl) smoothPlatterGeometry(vinyl, model.matrixWorld.clone().invert().multiply(vinyl.matrixWorld), true);
  const bits = model.getObjectByName('EXPORT_Bits_0') as THREE.Mesh | undefined;
  const deck = model.getObjectByName('EXPORT_Main_0') as THREE.Mesh | undefined;
  if (typeof document === 'undefined') return;
  if (bits) {
    const texture = canvasTexture(1024, 1024, ctx => {
      ctx.fillStyle = '#B49B73'; ctx.fillRect(0, 0, 1024, 1024);
      const sheen = ctx.createLinearGradient(0, 0, 1024, 700);
      sheen.addColorStop(0, '#786542'); sheen.addColorStop(.42, '#d6c3a0'); sheen.addColorStop(1, '#9c825b');
      ctx.fillStyle = sheen; ctx.fillRect(0, 0, 1024, 1024);
      ctx.fillStyle = 'rgba(40,25,10,.035)';
      for (let y = 0; y < 1024; y += 3) ctx.fillRect(0, y, 1024, 1);
      ctx.fillStyle = '#14120e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '500 95px Arial'; ctx.fillText('POWER', 512, 750);
      ctx.font = '600 70px Arial'; ctx.fillText('OFF', 290, 300); ctx.fillText('ON', 735, 300);
      ctx.strokeStyle = '#14120e'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(512, 512, 340, Math.PI * 1.20, Math.PI * 1.80); ctx.stroke();
      ctx.fillRect(505, 140, 14, 100);
    });
    const cap = new THREE.CircleGeometry(0.0695, 256);
    cap.rotateX(-Math.PI / 2).translate(.8775, .7047, 2.5545);
    const material = goldMaterial(); material.map = texture; material.color.set('#ffffff');
    material.addEventListener('dispose', () => texture?.dispose());
    attachInSourceSpace(bits, model, cap, material, 'gj-power-gold-cap');
  }
  if (deck) {
    const texture = canvasTexture(2048, 256, ctx => {
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '500 150px Georgia'; ctx.fillText('sessions with grandma', 1024, 134, 1980);
    });
    const plate = new THREE.PlaneGeometry(.445, .060);
    plate.rotateX(-Math.PI / 2).translate(2.35, .5510, 2.823);
    attachInSourceSpace(deck, model, plate, new THREE.MeshStandardMaterial({ color: '#171717', roughness: .65, metalness: .25 }), 'gj-brand-inlay');
    const lettering = new THREE.PlaneGeometry(.420, .0525);
    lettering.rotateX(-Math.PI / 2).translate(2.35, .5515, 2.823);
    const material = goldMaterial(); material.map = texture; material.transparent = true; material.depthWrite = false;
    material.addEventListener('dispose', () => texture?.dispose());
    attachInSourceSpace(deck, model, lettering, material, 'gj-sessions-lettering');
  }
}
