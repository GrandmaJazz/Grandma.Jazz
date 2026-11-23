// A playful spin always seats the personal name face at a full revolution.
// Preserve direction and the release velocity for a continuous, readable stop.
export function planBrickCoast(angle: number, velocity: number) {
  const speed = Math.abs(velocity);
  if (speed < 60) {
    return { target: Math.round(angle / 360) * 360, duration: 450, tangent: 0 };
  }
  const direction = Math.sign(velocity);
  const projected = Math.round((angle + velocity * .55) / 360) * 360;
  const minimum = angle + velocity * .18;
  const firstForward = (direction > 0 ? Math.ceil(minimum / 360) : Math.floor(minimum / 360)) * 360;
  const target = direction > 0 ? Math.max(projected, firstForward) : Math.min(projected, firstForward);
  const distance = Math.abs(target - angle);
  const duration = Math.max(450, Math.min(3000, 2000 * distance / speed));
  return { target, duration, tangent: Math.min(3, speed * duration / 1000 / distance) };
}

export function brickCoastProgress(t: number, tangent: number) {
  const u = Math.max(0, Math.min(1, t));
  // Cubic Hermite: departure slope matches the release, arrival slope is zero.
  return (tangent - 2) * u ** 3 + (3 - 2 * tangent) * u ** 2 + tangent * u;
}
