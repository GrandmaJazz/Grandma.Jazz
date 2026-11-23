import { describe, expect, it } from 'vitest';
import { brickCoastProgress, planBrickCoast } from '../client/src/family-original/components/brick-experience/brickCoast';

describe('family brick momentum', () => {
  it('lands on the name after a flick in either direction from any face', () => {
    for (let angle = -1080; angle <= 1080; angle += 15) {
      for (const velocity of [-2400, -440, -80, 0, 80, 440, 2400]) {
        const { target, tangent, duration } = planBrickCoast(angle, velocity);
        expect(Math.abs(target % 360)).toBe(0);
        if (Math.abs(velocity) >= 60) expect(Math.sign(target-angle)).toBe(Math.sign(velocity));
        expect(duration).toBeGreaterThanOrEqual(450);
        expect(duration).toBeLessThanOrEqual(3000);
        let previous = 0;
        for (let i = 1; i <= 100; i++) {
          const progress = brickCoastProgress(i/100, tangent);
          expect(progress).toBeGreaterThanOrEqual(previous-1e-9);
          previous = progress;
        }
        expect(previous).toBeCloseTo(1);
      }
    }
  });
});
