import { finite, fly, keyboardControls } from './flight';
import { createInteractions } from './world-interactions';
import { perceive } from './perception';
import { CELL, SEED, type WorldObject } from './world-model';
// Preserve the public simulation API while lower-level modules share only the model.
export { SIZE, CELL, SEED } from './world-model';
export type { Vector, WorldObject, FlightControls, NavigationStatus } from './world-model';
export function createTerrain(seed: number) {
  const phase = (seed >>> 0) * 0.017;
  const vertexHeight = (x: number, z: number) =>
    7 * Math.sin(x * 0.035 + phase) * Math.cos(z * 0.029 - phase) +
    3 * Math.sin(x * 0.085 + z * 0.055 + phase * 2) +
    1.2 * Math.cos(z * 0.16 - x * 0.09 + phase);
  // Interpolate the exact triangles used by the mesh.
  const height = (x: number, z: number) => {
    const x0 = Math.floor(x / CELL) * CELL;
    const z0 = Math.floor(z / CELL) * CELL;
    const u = (x - x0) / CELL;
    const v = (z - z0) / CELL;
    const a = vertexHeight(x0, z0);
    const b = vertexHeight(x0 + CELL, z0);
    const c = vertexHeight(x0, z0 + CELL);
    const d = vertexHeight(x0 + CELL, z0 + CELL);

    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - v) * (b - d) + (1 - u) * (c - d);
  };

  return { vertexHeight, height };
}
// Positions are absolute world coordinates.
export const INITIAL_OBJECTS: WorldObject[] = [
  { id: 'beacon-01', type: 'beacon', position: { x: -16, y: 0, z: -20 }, orientation: { x: 0, y: 0, z: 0 } },
  { id: 'rock-01', type: 'rock', position: { x: 20, y: 0, z: -12 }, orientation: { x: 0, y: 0.6, z: 0 } },
  { id: 'tower-01', type: 'tower', position: { x: 8, y: 0, z: -42 }, orientation: { x: 0, y: 0.3, z: 0 } },
].map((object) => ({
  ...object,
  position: { ...object.position, y: createTerrain(SEED).height(object.position.x, object.position.z) },
})) as WorldObject[];
export function createWorld(seed = SEED, objects: WorldObject[] = INITIAL_OBJECTS, now = () => performance.now()) {
  const terrain = createTerrain(seed);
  const player = { position: { x: 0, y: terrain.height(0, 12) + 5, z: 12 }, orientation: { x: 0, y: 0, z: 0 } };
  const landmarks = structuredClone(objects);
  const initialObjects = structuredClone(objects);
  const restore = () => {
    landmarks.splice(0, landmarks.length, ...structuredClone(initialObjects));
    Object.assign(player.position, { x: 0, y: terrain.height(0, 12) + 5, z: 12 });
    Object.assign(player.orientation, { x: 0, y: 0, z: 0 });
  };
  const { interact, navigation } = createInteractions({ player, height: terrain.height, landmarks }, { now, restore });

  function update(dt: number, keys: ReadonlySet<string>) {
    finite(dt);
    dt = Math.max(0, Math.min(dt, 0.05));
    const keyboard = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight'].some((k) =>
      keys.has(k),
    );

    if (keyboard) {
      interact.stop();
    }
    if (navigation.update(dt)) {
      return;
    }

    fly({ player, height: terrain.height }, keyboard ? keyboardControls(keys) : interact.getControls(), dt);
  }

  return {
    player,
    objects: landmarks,
    terrainHeight: terrain.height,
    update,
    reset: interact.reset,
    interact,
    observe: () => ({ seed, ...perceive(player, landmarks) }),
    inspect: () => structuredClone({ seed, player, objects: landmarks }),
  };
}

export type World = ReturnType<typeof createWorld>;
