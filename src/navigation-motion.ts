import type { Vector } from './world-model';
import { headingTo, turnTowards, type Height, type Player } from './flight';

// Physical stepping retains the same arrival, terrain and stalled-progress rules.
export function createMotion(player: Player, height: Height) {
  let inactiveTime = 0, progressDistance = Infinity;
  const distanceTo = (target: Vector) => Math.hypot(target.x - player.position.x, target.y - player.position.y, target.z - player.position.z);
  function advance(target: Vector, dt: number) {
    inactiveTime += dt;
    const p = player.position;
    const dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z;
    const distance = distanceTo(target);
    if (progressDistance - distance >= 0.05) { progressDistance = distance; inactiveTime = 0; }
    if (target.y < height(target.x, target.z) + 1.5) return 'blocked';
    if (distance <= 0.15) return 'arrived';
    if (inactiveTime >= 5) return 'blocked';
    turnTowards(player, headingTo(player, target), dt);
    const scale = Math.min(1, 12 * dt / distance);
    p.x += dx * scale; p.z += dz * scale; p.y += dy * scale;
    p.y = Math.max(p.y, height(p.x, p.z) + 1.5);
    return 'moving';
  }
  return {
    distanceTo,
    start(target: Vector) { inactiveTime = 0; progressDistance = distanceTo(target); return progressDistance; },
    step(target: Vector, dt: number) {
      try { return advance(target, dt); } catch { return 'failed'; }
    },
  };
}
