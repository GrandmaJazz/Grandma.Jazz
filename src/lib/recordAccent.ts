import * as THREE from 'three';

/** Keep the vinyl and hardware maps intact. Replace only the baked centre
 *  sticker with the selected cover; the cartridge keeps its matching accent.
 *  Both intro models share the same uniforms, including during prewarming. */
export function applyRecordAccent(
  material: THREE.Material,
  accent: { value: THREE.Color },
  artwork: { value: THREE.Texture },
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const label = material.name === 'Tube010__0';
  if (!label && material.name !== 'Bits') return;
  if (material.userData.gjRecordAccent === accent) return;
  material.userData.gjRecordAccent = accent;
  material.onBeforeCompile = shader => {
    shader.uniforms.gjRecordAccent = accent;
    if (label) shader.uniforms.gjRecordArtwork = artwork;
    shader.fragmentShader = `uniform vec3 gjRecordAccent;\n${label ? 'uniform sampler2D gjRecordArtwork;\n' : ''}${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      ${label ? `
        // The original sticker occupies this circle in both GLB UV atlases.
        float gjLabelMask = 1.0 - smoothstep(0.153, 0.157, length(vMapUv - vec2(0.5)));
        // Fit the rounded square cover inside its circular black label so
        // the album name, frame and corner mark remain readable.
        vec2 gjCoverUv = (vMapUv - vec2(0.5)) / 0.25 + vec2(0.5);
        float gjInsideCover = step(0.0, gjCoverUv.x) * step(gjCoverUv.x, 1.0)
          * step(0.0, gjCoverUv.y) * step(gjCoverUv.y, 1.0);
        vec3 gjCoverInk = texture2D(gjRecordArtwork, clamp(gjCoverUv, 0.0, 1.0)).rgb * gjInsideCover;
        diffuseColor.rgb = mix(diffuseColor.rgb, gjCoverInk, gjLabelMask);
      ` : `
        float gjAccentMask = smoothstep(0.25, 0.35, diffuseColor.g)
          * smoothstep(0.10, 0.20, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        float gjInkShade = clamp(diffuseColor.g / 0.53, 0.0, 1.1);
        diffuseColor.rgb = mix(diffuseColor.rgb, gjRecordAccent * gjInkShade, gjAccentMask);
      `}`
    );
    if (label) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.84, gjLabelMask);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, gjLabelMask);')
        // Keep the small printed title legible under the intro's low exposure.
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gjCoverInk * gjLabelMask * 0.65;');
    }
  };
  material.customProgramCacheKey = () => `gj-record-artwork-v2-${label ? 'label' : 'needle'}`;
  material.needsUpdate = true;
}
