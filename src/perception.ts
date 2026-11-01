import type { Player } from './flight';
import type { WorldObject } from './world-model';

// Object centers, inclusive boundaries; no occlusion. Positive X pitch looks up.
export const HORIZONTAL_FIELD_OF_VIEW = Math.PI / 2;
export const VERTICAL_FIELD_OF_VIEW = Math.PI / 2;
export const MAX_OBSERVATION_DISTANCE = 60;

export function perceive(player: Player, objects: readonly WorldObject[]) {
  const visible = objects.filter(({ position }) => {
    const dx = position.x - player.position.x;
    const dy = position.y - player.position.y;
    const dz = position.z - player.position.z;
    if (Math.hypot(dx, dy, dz) > MAX_OBSERVATION_DISTANCE) return false;
    const horizontalDistance = Math.hypot(dx, dz);
    const forward = -Math.sin(player.orientation.y) * dx - Math.cos(player.orientation.y) * dz;
    const elevation = Math.atan2(dy, horizontalDistance);
    const pitchDifference = elevation - player.orientation.x;
    const verticalAngle = Math.atan2(Math.sin(pitchDifference), Math.cos(pitchDifference));
    return forward >= horizontalDistance * Math.cos(HORIZONTAL_FIELD_OF_VIEW / 2) - 1e-9
      && Math.abs(verticalAngle) <= VERTICAL_FIELD_OF_VIEW / 2 + 1e-9;
  });
  return structuredClone({ player, objects: visible });
}
