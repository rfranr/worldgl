import type { NavigationStatus, Vector } from './world-model';
import { headingTo, position, turnTowards, type Height, type Player } from './flight';

export function createNavigation(player: Player, height: Height) {
  let status: NavigationStatus = { state: 'idle' };
  let rotation: number | undefined;
  let inactiveTime = 0, progressDistance = Infinity;
  function stop() { status = { state: 'idle' }; rotation = undefined; }
  function moveTo(target: Vector) {
    position(target); stop();
    status = { state: 'moving', target: { ...target } };
    inactiveTime = 0;
    progressDistance = Math.hypot(target.x - player.position.x, target.y - player.position.y, target.z - player.position.z);
  }
  function advance(dt: number) {
    inactiveTime += dt;
    const target = status.target!, p = player.position;
    const dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z;
    const distance = Math.hypot(dx, dy, dz);
    // Jitter must not keep a trip alive.
    if (progressDistance - distance >= 0.05) { progressDistance = distance; inactiveTime = 0; }
    if (target.y < height(target.x, target.z) + 1.5) { status.state = 'blocked'; return; }
    if (distance <= 0.15) { status.state = 'arrived'; return; }
    if (inactiveTime >= 5) { status.state = 'blocked'; return; }
    turnTowards(player, headingTo(player, target), dt);
    const scale = Math.min(1, 12 * dt / distance);
    p.x += dx * scale; p.z += dz * scale; p.y += dy * scale;
    p.y = Math.max(p.y, height(p.x, p.z) + 1.5);
  }
  function update(dt: number) {
    if (status.state === 'moving') { advance(dt); return true; }
    if (rotation === undefined) return false;
    if (turnTowards(player, rotation, dt)) rotation = undefined;
    return true;
  }
  return { stop, moveTo, update, getStatus: () => structuredClone(status),
    rotate(target: number) { stop(); rotation = target; } };
}
