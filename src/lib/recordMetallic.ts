import * as THREE from 'three';

// The approved warm brand accent, independent of the album's printed ink.
const BRAND_METAL = '#B49B73';

/** Select the restored platter lip and the two highlighted controls in the
 * source pose. Store the mask on the geometry so it follows the animated arm. */
export function applyRecordMetallic(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const sourceSpace = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node.userData.gjMetallic) return;
    const lip = node.name.startsWith('Object035_Main_0');
    const bits = node.material instanceof THREE.MeshStandardMaterial && node.material.name === 'Bits';
    if (!lip && !bits) return;
    const position = node.geometry.getAttribute('position');
    const mask = new Float32Array(position.count);
    const point = new THREE.Vector3();
    let selected = false;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld).applyMatrix4(sourceSpace);
      const cornerControl = point.x < 1.06 && point.z < 1.46 && point.y > 0.548;
      const counterweight = node.name.startsWith('Object036_Bits') && point.z < 1.49 && point.y > 0.665;
      mask[i] = lip || cornerControl || counterweight ? 1 : 0;
      selected ||= mask[i] === 1;
    }
    if (!selected) return;
    node.userData.gjMetallic = true;
    // Shared export materials also serve the deck and cartridge. Isolate only
    // the highlighted meshes and preserve the existing album shader hook.
    const material = (node.material as THREE.MeshStandardMaterial).clone();
    const original = node.material as THREE.MeshStandardMaterial;
    const previousCompile = original.onBeforeCompile;
    const previousKey = original.customProgramCacheKey();
    node.material = material;
    node.geometry.setAttribute('gjMetalMask', new THREE.BufferAttribute(mask, 1));
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(original, shader, renderer);
      shader.uniforms.gjBrandMetal = { value: new THREE.Color(BRAND_METAL) };
      shader.vertexShader = `attribute float gjMetalMask; varying float gjMetal; varying vec3 gjMetalPosition;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ngjMetal = gjMetalMask; gjMetalPosition = position;');
      shader.fragmentShader = `uniform vec3 gjBrandMetal; varying float gjMetal; varying vec3 gjMetalPosition;\n${shader.fragmentShader}`
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
          // Fine continuous machining replaces the blocky baked colour.
          float gjBrushing = 0.96 + 0.04 * sin(gjMetalPosition.z * 180.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, gjBrandMetal * gjBrushing, gjMetal);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.34, gjMetal);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.72, gjMetal);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, gjMetal));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gjBrandMetal * gjMetal * 0.055;');
    };
    material.customProgramCacheKey = () => `${previousKey}-gj-brand-metal-v1`;
    material.needsUpdate = true;
  });
}
