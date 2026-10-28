import * as THREE from 'three';

/** Preview-only close-up surfaces. The production turntable remains unchanged. */
export function addRecordMacroDetails(model: THREE.Object3D) {
  // The source black inlay is nearly coplanar with the deck. Give it a
  // physical clearance plus depth bias for the far end of the camera move.
  const mount = model.getObjectByName('gj-tonearm-mount-black');
  if (mount instanceof THREE.Mesh && mount.material instanceof THREE.Material) {
    mount.position.y = .554;
    mount.material.polygonOffset = true;
    mount.material.polygonOffsetFactor = -1;
    mount.material.polygonOffsetUnits = -2;
  }
  model.updateMatrixWorld(true);
  const lip = model.getObjectByName('Object035_Main_0') as THREE.Mesh | undefined;
  if (lip) {
    const old = lip.material;
    lip.material = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: .38, metalness: .5 });
    // The source's baked dots become actual rounded metal faces for the macro pass.
    // All instances belong to the animated lip, so spin and accent remain locked.
    const rows = [.566, .589, .613, .637];
    const columns = 112;
    const geometry = new THREE.SphereGeometry(1, 32, 12);
    const gold = new THREE.MeshStandardMaterial({ color: '#B49B73', roughness: .36, metalness: .72 });
    const recess = new THREE.MeshStandardMaterial({ color: '#050505', roughness: .45, metalness: .3 });
    const studs = new THREE.InstancedMesh(geometry, gold, rows.length * columns);
    const sockets = new THREE.InstancedMesh(geometry, recess, rows.length * columns);
    studs.name = 'gj-macro-gold-studs'; sockets.name = 'gj-macro-stud-recesses';
    const sourceToLocal = lip.matrixWorld.clone().invert().multiply(model.matrixWorld);
    const obj = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    let index = 0;
    for (let row = 0; row < rows.length; row++) for (let column = 0; column < columns; column++) {
      const angle = (column + (row % 2) * .5) / columns * Math.PI * 2;
      const y = rows[row], radius = .818575 - (y - .550329) * .774;
      const direction = new THREE.Vector3(Math.cos(angle), .774, Math.sin(angle)).normalize();
      obj.position.set(1.6501203 + radius * Math.cos(angle), y, 2.0307182 + radius * Math.sin(angle));
      obj.quaternion.setFromUnitVectors(up, direction);
      const face = row === 3 ? .0048 : .0067;
      obj.scale.set(face + .0012, .0011, face + .0012); obj.updateMatrix();
      sockets.setMatrixAt(index, sourceToLocal.clone().multiply(obj.matrix));
      obj.position.addScaledVector(direction, .0008);
      obj.scale.set(face, .00165, face); obj.updateMatrix();
      studs.setMatrixAt(index++, sourceToLocal.clone().multiply(obj.matrix));
    }
    lip.add(sockets, studs);
    (Array.isArray(old) ? old : [old]).forEach(material => material.dispose());
  }
  const vinyl = model.getObjectByName('Tube010__0') as THREE.Mesh | undefined;
  if (vinyl && vinyl.material instanceof THREE.MeshStandardMaterial) {
    const material = vinyl.material, previous = material.onBeforeCompile, key = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
          float macroVinyl = smoothstep(0.184, 0.189, gjRadius);
          // Broad groove bands remain legible in the wide shot; fine cuts
          // fade independently at subpixel size instead of erasing all detail.
          float macroPhase = gjRadius * 1400.0;
          float macroFilter = exp(-fwidth(macroPhase));
          float macroFinePhase = gjRadius * 7200.0;
          float macroFine = sin(macroFinePhase) * exp(-fwidth(macroFinePhase));
          float macroGroove = sin(macroPhase) * macroFilter;
          float macroBand = sin(gjRadius * 210.0) * 0.5 + 0.5;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.009 + macroGroove * 0.003 + macroFine * 0.0005 + macroBand * 0.001), macroVinyl);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.36 + macroGroove * 0.09 + macroFine * 0.025, macroVinyl);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 0.65, macroVinyl);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 macroN = nonPerturbedNormal;
          vec3 macroQ0 = dFdx(-vViewPosition), macroQ1 = dFdy(-vViewPosition);
          vec3 macroR0 = cross(macroQ1, macroN), macroR1 = cross(macroN, macroQ0);
          float macroDet = dot(macroQ0, macroR0);
          float macroHeight = macroGroove * 0.00012 + macroFine * 0.000012;
          vec3 macroGradient = sign(macroDet) * (dFdx(macroHeight) * macroR0 + dFdy(macroHeight) * macroR1);
          vec3 macroNormal = normalize(abs(macroDet) * macroN - macroGradient);
          normal = normalize(mix(normal, macroNormal, macroVinyl));`);
    };
    material.customProgramCacheKey = () => `${key}-macro-vinyl-v2`;
    material.needsUpdate = true;
  }
}
