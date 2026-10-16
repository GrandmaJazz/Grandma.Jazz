import * as THREE from 'three';

/** Recolour only the label's gold ink and the cartridge's green plastic.
 *  Keep the original maps, normals, reflections and all other hardware intact.
 *  Both intro models share these material names and use the same uniform. */
export function applyRecordAccent(material: THREE.Material, accent: { value: THREE.Color }) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const label = material.name === 'Tube010__0';
  if (!label && material.name !== 'Bits') return;
  if (material.userData.gjRecordAccent === accent) return;
  material.userData.gjRecordAccent = accent;
  material.onBeforeCompile = shader => {
    shader.uniforms.gjRecordAccent = accent;
    shader.fragmentShader = `uniform vec3 gjRecordAccent;\n${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      ${label ? `
        float gjAccentMask = smoothstep(0.025, 0.09, diffuseColor.r - diffuseColor.b)
          * smoothstep(0.02, 0.06, diffuseColor.g - diffuseColor.b);
        float gjInkShade = clamp(diffuseColor.r / 0.72, 0.0, 1.1);
      ` : `
        float gjAccentMask = smoothstep(0.25, 0.35, diffuseColor.g)
          * smoothstep(0.10, 0.20, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        float gjInkShade = clamp(diffuseColor.g / 0.53, 0.0, 1.1);
      `}
      diffuseColor.rgb = mix(diffuseColor.rgb, gjRecordAccent * gjInkShade, gjAccentMask);`
    );
  };
  material.customProgramCacheKey = () => `gj-record-accent-v1-${label ? 'label' : 'needle'}`;
  material.needsUpdate = true;
}
