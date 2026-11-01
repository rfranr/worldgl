import { SIZE, type FlightControls, type Vector } from './world-model';

export type Player = { position: Vector; orientation: Vector };
export type Height = (x: number, z: number) => number;
export const zeroControls = (): FlightControls => ({ forward: 0, turn: 0, strafe: 0, vertical: 0 });
export const finite = (n: number) => { if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error('Expected finite number'); };
export function vector(v: Vector) { if (!v) throw new Error('Expected vector'); finite(v.x); finite(v.y); finite(v.z); }
export function position(v: Vector) {
  vector(v);
  const bound = SIZE / 2 - 2;
  if (Math.abs(v.x) > bound || Math.abs(v.z) > bound || v.y > 65 || v.y < -65) throw new Error('Position outside world bounds');
}
export function headingTo(player: Player, target: Vector) {
  const dx = target.x - player.position.x, dz = target.z - player.position.z;
  return Math.hypot(dx, dz) > 1e-9 ? Math.atan2(-dx, -dz) : player.orientation.y;
}
export function elevationTo(player: Player, target: Vector) {
  const dx = target.x - player.position.x, dy = target.y - player.position.y, dz = target.z - player.position.z;
  return Math.hypot(dx, dy, dz) > 1e-9 ? Math.atan2(dy, Math.hypot(dx, dz)) : player.orientation.x;
}
export function turnTowards(player: Player, target: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - player.orientation.y), Math.cos(target - player.orientation.y));
  const step = 1.8 * dt;
  player.orientation.y += Math.max(-step, Math.min(step, delta));
  return Math.abs(delta) <= step;
}
export function keyboardControls(keys: ReadonlySet<string>) {
  const axis = (positive: string, negative: string) => Number(keys.has(positive)) - Number(keys.has(negative));
  return {
    forward: axis('KeyW', 'KeyS'), turn: axis('KeyA', 'KeyD'), strafe: axis('KeyE', 'KeyQ'),
    vertical: Number(keys.has('Space')) - Number(keys.has('ShiftLeft') || keys.has('ShiftRight')),
  };
}
export function fly({ player, height }: { player: Player; height: Height }, input: FlightControls, dt: number) {
  player.orientation.y += input.turn * dt * 1.8;
  const { forward, strafe } = input;
  const scale = 18 * dt / Math.max(1, Math.hypot(forward, strafe));
  const yaw = player.orientation.y;
  player.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * scale;
  player.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * scale;
  const bound = SIZE / 2 - 2;
  player.position.x = Math.max(-bound, Math.min(bound, player.position.x));
  player.position.z = Math.max(-bound, Math.min(bound, player.position.z));
  player.position.y += input.vertical * 12 * dt;
  player.position.y = Math.max(height(player.position.x, player.position.z) + 1.5, Math.min(65, player.position.y));
}
