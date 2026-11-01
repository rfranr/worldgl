import type { Player } from './flight';
import type { WorldObject } from './world-model';

// Object centers, inclusive boundaries; no occlusion or vertical field of view.
export const HORIZONTAL_FIELD_OF_VIEW = Math.PI / 2;
export const MAX_OBSERVATION_DISTANCE = 60;

export function perceive(player: Player, objects: readonly WorldObject[]) {
  const visible = objects.filter(({ position }) => {
    const dx = position.x - player.position.x;
    const dy = position.y - player.position.y;
    const dz = position.z - player.position.z;
    if (Math.hypot(dx, dy, dz) > MAX_OBSERVATION_DISTANCE) return false;
    const horizontalDistance = Math.hypot(dx, dz);
    const forward = -Math.sin(player.orientation.y) * dx - Math.cos(player.orientation.y) * dz;
    return forward >= horizontalDistance * Math.cos(HORIZONTAL_FIELD_OF_VIEW / 2) - 1e-9;
  });
  return structuredClone({ player, objects: visible });
}
