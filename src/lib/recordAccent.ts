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
        float gjRadius = length(vMapUv - vec2(0.5));
        float gjEdgeAA = max(fwidth(gjRadius), 0.00015);
        float gjLabelMask = 1.0 - smoothstep(0.148 - gjEdgeAA, 0.148 + gjEdgeAA, gjRadius);
        float gjLabelGold = smoothstep(0.148 - gjEdgeAA, 0.148 + gjEdgeAA, gjRadius)
          * (1.0 - smoothstep(0.184 - gjEdgeAA, 0.184 + gjEdgeAA, gjRadius));
        vec3 gjLabelMetal = vec3(0.4564, 0.3278, 0.1714); // linear #B49B73
        float gjBrushPhase = gjRadius * 2200.0;
        float gjLabelBrush = sin(gjBrushPhase) * exp(-fwidth(gjBrushPhase));
        // Sample the independent circular label over the entire sticker.
        // No title, square sleeve border, or additional ink ring.
        vec2 gjCoverUv = (vMapUv - vec2(0.5)) / 0.296 + vec2(0.5);
        vec3 gjCoverInk = texture2D(gjRecordArtwork, clamp(gjCoverUv, 0.0, 1.0)).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, gjCoverInk, gjLabelMask);
        diffuseColor.rgb = mix(diffuseColor.rgb, gjLabelMetal * (1.0 + gjLabelBrush * 0.06), gjLabelGold);
      ` : `
        float gjAccentMask = smoothstep(0.25, 0.35, diffuseColor.g)
          * smoothstep(0.10, 0.20, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        float gjInkShade = clamp(diffuseColor.g / 0.53, 0.0, 1.1);
        diffuseColor.rgb = mix(diffuseColor.rgb, gjRecordAccent * gjInkShade, gjAccentMask);
      `}`
    );
    if (label) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.84, gjLabelMask); roughnessFactor = mix(roughnessFactor, 0.36 + gjLabelBrush * 0.035, gjLabelGold);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, gjLabelMask); metalnessFactor = mix(metalnessFactor, 0.68, gjLabelGold);')
        // Keep the printed label artwork visible under the intro's low exposure.
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gjCoverInk * gjLabelMask * 0.65 + gjLabelMetal * gjLabelGold * 0.055;');
    }
  };
  material.customProgramCacheKey = () => `gj-record-artwork-v5-${label ? 'label' : 'needle'}`;
  material.needsUpdate = true;
}
