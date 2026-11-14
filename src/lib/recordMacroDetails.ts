import * as THREE from 'three';

/** Close-up surfaces shared by the homepage flight and its preview. */
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
    // The black platter wall can catch the same narrow glint as the deck.
    const platter = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: .54, metalness: .32 });
    lip.material = platter;
    // The source's baked dots become actual rounded metal faces for the macro pass.
    // All instances belong to the animated lip, so spin and accent remain locked.
    const rows = [.566, .589, .613, .637];
    const columns = 112;
    const geometry = new THREE.SphereGeometry(1, 32, 12);
    const gold = new THREE.MeshStandardMaterial({ color: '#B49B73', roughness: .52, metalness: .62 });
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
          // Keep a visible groove profile at the shallow opening angle. The
          // finer cuts resolve in the foreground and blend into grouped rings
          // as the disc recedes. All phases are fixed to the spinning vinyl.
          vec2 macroUv = vMapUv - vec2(0.5);
          float macroAngle = atan(macroUv.y, macroUv.x + 0.000001);
          float macroPitch = gjRadius + sin(gjRadius * 87.0) * 0.0011;
          float macroPhase = macroPitch * 3200.0 + sin(macroAngle * 23.0 + gjRadius * 740.0) * 0.19;
          float macroGroupPhase = macroPitch * 1600.0;
          float macroFinePhase = macroPhase * 2.0;
          float macroFootprint = fwidth(macroPhase);
          float macroCutAA = 1.0 - smoothstep(1.2, 3.1, macroFootprint);
          float macroGroupAA = (1.0 - macroCutAA) * (1.0 - smoothstep(1.2, 3.1, fwidth(macroGroupPhase)));
          float macroFineAA = 1.0 - smoothstep(0.9, 2.8, fwidth(macroFinePhase));
          float macroGap = exp(-pow(abs(gjRadius - 0.285) / 0.0013, 2.0))
            + exp(-pow(abs(gjRadius - 0.386) / 0.0016, 2.0));
          float macroCut = 1.0 - macroGap * 0.82;
          float macroGroove = macroCut * (cos(macroPhase) * macroCutAA
            + cos(macroGroupPhase) * macroGroupAA * 0.85
            + cos(macroFinePhase) * macroFineAA * 0.16);
          float macroBand = sin(gjRadius * 93.0 + sin(gjRadius * 37.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.007 + macroBand * 0.001
            + macroGroove * 0.0024), macroVinyl);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.355 + macroGroove * 0.045
            + macroBand * 0.012 - macroGap * 0.025, macroVinyl);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 0.0, macroVinyl);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 macroN = nonPerturbedNormal;
          vec3 macroQ0 = dFdx(-vViewPosition), macroQ1 = dFdy(-vViewPosition);
          vec3 macroR0 = cross(macroQ1, macroN), macroR1 = cross(macroN, macroQ0);
          float macroDet = dot(macroQ0, macroR0);
          // Differentiate only the phase, not its screen-space filter.
          float macroSlope = -macroCut * (sin(macroPhase) * macroCutAA * 0.000024
            + sin(macroGroupPhase) * macroGroupAA * 0.000013
            + sin(macroFinePhase) * macroFineAA * 0.000004);
          vec3 macroGradient = sign(macroDet) * macroSlope
            * (dFdx(macroPhase) * macroR0 + dFdy(macroPhase) * macroR1);
          vec3 macroNormal = normalize(max(abs(macroDet), 1e-12) * macroN - macroGradient);
          normal = normalize(mix(normal, macroNormal, macroVinyl));`)
        .replace('#include <opaque_fragment>', `
          // The cut edges break up the grazing reflection as well as the base
          // colour, so the grooves remain legible inside the bright streak.
          outgoingLight *= 1.0 + macroVinyl * macroGroove * 0.22;
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => `${key}-macro-vinyl-v4`;
    material.needsUpdate = true;
  }
}
