import type { NavigationBlockage, Vector } from './world-model';
import { headingTo, turnTowards, type Height, type Player } from './flight';
// Physical stepping retains the same arrival, terrain and stalled-progress rules.
export function createMotion(player: Player, height: Height) {
  let blockage: NavigationBlockage | undefined;
  let inactiveTime = 0;
  let progressDistance = Infinity;
  const distanceTo = (target: Vector) =>
    Math.hypot(target.x - player.position.x, target.y - player.position.y, target.z - player.position.z);

  function clearanceBlockage(target: Vector): NavigationBlockage | undefined {
    const minimumTargetY = height(target.x, target.z) + 1.5;

    if (target.y < minimumTargetY) {
      return {
        reason: 'destination_below_clearance',
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        target: { ...target },
        constraints: { minimumTargetY },
      };
    }

    return undefined;
  }

  function trackProgress(distance: number, dt: number) {
    inactiveTime += dt;

    if (progressDistance - distance >= 0.05) {
      progressDistance = distance;
      inactiveTime = 0;
    }
  }

  function advance(target: Vector, dt: number) {
    const p = player.position;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = target.z - p.z;
    const distance = distanceTo(target);

    trackProgress(distance, dt);
    blockage = clearanceBlockage(target);

    if (blockage) {
      return 'blocked';
    }
    if (distance <= 0.15) {
      return 'arrived';
    }
    if (inactiveTime >= 5) {
      blockage = {
        reason: 'no_progress',
        position: { x: p.x, y: p.y, z: p.z },
        target: { ...target },
        progress: { distanceRemaining: distance, secondsWithoutProgress: inactiveTime },
      };

      return 'blocked';
    }

    turnTowards(player, headingTo(player, target), dt);
    const scale = Math.min(1, (12 * dt) / distance);

    p.x += dx * scale;
    p.z += dz * scale;
    p.y += dy * scale;
    p.y = Math.max(p.y, height(p.x, p.z) + 1.5);

    return 'moving';
  }

  return {
    distanceTo,
    getBlockage: () => blockage,
    start(target: Vector) {
      blockage = undefined;
      inactiveTime = 0;
      progressDistance = distanceTo(target);

      return progressDistance;
    },
    step(target: Vector, dt: number) {
      try {
        return advance(target, dt);
      } catch {
        return 'failed';
      }
    },
  };
}
