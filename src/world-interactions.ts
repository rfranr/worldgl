import type { FlightControls, Vector, WorldObject } from './world-model';
import { finite, headingTo, position, vector, zeroControls, type Height, type Player } from './flight';
import { createNavigation } from './navigation';

function objectInteractions(landmarks: WorldObject[]) {
  const find = (id: string) => {
    const object = landmarks.find(o => o.id === id);
    if (!object) throw new Error('Unknown object ID');
    return object;
  };
  return {
    addObject(object: WorldObject) {
      if (!object || typeof object.id !== 'string' || !object.id || landmarks.some(o => o.id === object.id)) throw new Error('Invalid or duplicate ID');
      if (!['rock', 'tower', 'beacon'].includes(object.type)) throw new Error('Unknown object type');
      position(object.position); vector(object.orientation); landmarks.push(structuredClone(object));
    },
    removeObject(id: string) { landmarks.splice(landmarks.indexOf(find(id)), 1); },
    moveObject(id: string, p: Vector) { position(p); find(id).position = { ...p }; },
  };
}
function validateControlValue(value: number) {
  finite(value); if (Math.abs(value) > 1) throw new Error('Control outside -1..1');
}
function validateControls(patch: Partial<FlightControls>) {
  if (!patch || typeof patch !== 'object') throw new Error('Expected controls');
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in zeroControls())) throw new Error('Unknown control');
    validateControlValue(value);
  }
}
function createControls(now: () => number, cancel: () => void) {
  let controls = zeroControls(), timeout = 2000, refreshed = 0;
  return {
    clear() { controls = zeroControls(); },
    setControls(patch: Partial<FlightControls>) {
      validateControls(patch);
      cancel(); controls = { ...controls, ...patch }; refreshed = now();
    },
    getControls() { if (now() - refreshed >= timeout) controls = zeroControls(); return { ...controls }; },
    setControlTimeout(milliseconds: number) {
      finite(milliseconds); if (milliseconds < 0) throw new Error('Negative timeout'); timeout = milliseconds;
    },
  };
}
function displacementTarget(player: Player, displacement: { forward?: number; right?: number; up?: number }) {
  if (!displacement || typeof displacement !== 'object') throw new Error('Expected displacement');
  for (const [key, value] of Object.entries(displacement)) {
    if (!['forward', 'right', 'up'].includes(key)) throw new Error('Unknown displacement');
    finite(value);
  }
  const { forward = 0, right = 0, up = 0 } = displacement;
  const yaw = player.orientation.y, p = player.position;
  return { x: p.x - Math.sin(yaw) * forward + Math.cos(yaw) * right,
    y: p.y + up, z: p.z - Math.cos(yaw) * forward - Math.sin(yaw) * right };
}
export function createInteractions({ player, height, landmarks }: { player: Player; height: Height; landmarks: WorldObject[] }, { now, restore }: { now: () => number; restore: () => void }) {
  const navigation = createNavigation(player, height);
  const controls = createControls(now, navigation.stop);
  const stop = () => { controls.clear(); navigation.stop(); };
  const moveTo = (target: Vector, options?: { queue?: boolean }) => {
    const acknowledgement = navigation.moveTo(target, options);
    controls.clear();
    return acknowledgement;
  };
  const reset = () => { stop(); restore(); };
  const interact = Object.freeze({
    setControls: controls.setControls, getControls: controls.getControls, setControlTimeout: controls.setControlTimeout,
    moveTo, stop, reset, getNavigationStatus: navigation.getStatus,
    abortNavigation() { controls.clear(); navigation.abort(); return { stopped: true }; },
    turnBy({ radians }: { radians: number }) { finite(radians); stop(); navigation.rotate(player.orientation.y + radians); },
    lookAt(target: Vector) { vector(target); stop(); navigation.rotate(headingTo(player, target)); },
    moveBy(displacement: { forward?: number; right?: number; up?: number }) { moveTo(displacementTarget(player, displacement)); },
    setPlayerPosition(p: Vector) {
      position(p); stop(); Object.assign(player.position, p);
      player.position.y = Math.max(p.y, height(p.x, p.z) + 1.5);
    },
    setPlayerOrientation(o: Vector) { vector(o); stop(); Object.assign(player.orientation, o); },
    ...objectInteractions(landmarks),
  });
  return { interact, navigation };
}
