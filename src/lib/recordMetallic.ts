import * as THREE from 'three';

const BRAND_METAL = '#B49B73';

/** Fine edge trim over the original textured hardware. Source-pose positions
 * follow the animated arm and rotating platter without changing their maps. */
export function applyRecordMetallic(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const sourceSpace = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node.userData.gjMetallic) return;
    const lip = node.name.startsWith('Object035_Main_0');
    const bits = node.material instanceof THREE.MeshStandardMaterial && node.material.name === 'Bits';
    if (!lip && !bits) return;
    const positions = node.geometry.getAttribute('position');
    const details = new Float32Array(positions.count * 3);
    const point = new THREE.Vector3();
    let selected = lip;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).applyMatrix4(sourceSpace);
      point.toArray(details, i * 3);
      selected ||= (point.x < 1.06 && point.z < 1.46 && point.y > 0.548)
        || (node.name.startsWith('Object036_Bits') && point.z < 1.49 && point.y > 0.665);
    }
    if (!selected) return;
    node.userData.gjMetallic = true;
    const original = node.material as THREE.MeshStandardMaterial;
    const material = original.clone();
    const previousCompile = original.onBeforeCompile;
    const previousKey = original.customProgramCacheKey();
    node.material = material;
    node.geometry.setAttribute('gjDetailPosition', new THREE.BufferAttribute(details, 3));
    const arm = node.name.startsWith('Object036_Bits');
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(original, shader, renderer);
      shader.uniforms.gjBrandMetal = { value: new THREE.Color(BRAND_METAL) };
      shader.vertexShader = `attribute vec3 gjDetailPosition; varying vec3 gjDetail;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ngjDetail = gjDetailPosition;');
      shader.fragmentShader = `uniform vec3 gjBrandMetal; varying vec3 gjDetail;\n${shader.fragmentShader}`
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
          float gjTrim = 0.0;
          float gjLettering = 0.0;
          ${lip ? `
            // Two narrow machined edges; the full black studded band remains.
            gjTrim = smoothstep(0.6515, 0.6545, gjDetail.y)
              + (1.0 - smoothstep(0.5520, 0.5550, gjDetail.y));
          ` : arm ? `
            float gjWeight = step(gjDetail.z, 1.49) * step(0.665, gjDetail.y);
            gjTrim = gjWeight * max(
              1.0 - smoothstep(0.002, 0.004, abs(gjDetail.z - 1.296)),
              1.0 - smoothstep(0.002, 0.004, abs(gjDetail.z - 1.470)));
            // Tint the existing light calibration numbers, never the body.
            gjLettering = gjWeight * smoothstep(0.12, 0.40, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)));
          ` : `
            float gjKnobRadius = length(gjDetail.xz - vec2(0.951, 1.3475));
            float gjKnob = step(gjKnobRadius, 0.094) * step(0.548, gjDetail.y);
            gjTrim = gjKnob * (1.0 - smoothstep(0.0015, 0.003, abs(gjKnobRadius - 0.088)));
            gjLettering = gjKnob * smoothstep(0.12, 0.40, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)));
          `}
          float gjGold = clamp(max(gjTrim, gjLettering), 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, gjBrandMetal, gjGold);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, gjGold);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.68, gjGold);')
        // Keep the original stud/knurl normal detail. Only the hairline trim
        // receives a clean continuous normal to cover the pixelated seam.
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, clamp(gjTrim, 0.0, 1.0)));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gjBrandMetal * gjGold * 0.055;');
    };
    material.customProgramCacheKey = () => `${previousKey}-gj-fine-gold-v2-${lip ? 'rim' : arm ? 'weight' : 'knob'}`;
    material.needsUpdate = true;
  });
}
