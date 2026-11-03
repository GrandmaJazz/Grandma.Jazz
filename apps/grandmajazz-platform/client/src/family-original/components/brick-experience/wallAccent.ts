import { BRICK_BODY } from './brickDepth';

// Reuse the badge's original outer contour; saved artwork is unchanged.
export function wallAccent(svg: string): string {
  const accent = `<path class="family-wall-accent" d="${BRICK_BODY.path}" transform="translate(${BRICK_BODY.x},${BRICK_BODY.y})" aria-hidden="true"/>`;
  return svg.replace(/(<image\b[^>]*\/>)/, `$1${accent}`);
}
