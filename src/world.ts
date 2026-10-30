// Pure simulation: no DOM or rendering dependencies. Y is up; angles are radians.
export const SIZE = 240;
export const CELL = 4;
export const SEED = 213;
export type Vector = { x: number; y: number; z: number };
export type WorldObject = { id: string; type: 'beacon' | 'rock' | 'tower'; position: Vector; orientation: Vector };

export function createTerrain(seed: number) {
  const phase = (seed >>> 0) * 0.017;
  const vertexHeight = (x: number, z: number) =>
    7 * Math.sin(x * 0.035 + phase) * Math.cos(z * 0.029 - phase) +
    3 * Math.sin(x * 0.085 + z * 0.055 + phase * 2) +
    1.2 * Math.cos(z * 0.16 - x * 0.09 + phase);
  // Interpolate the exact triangles used by the mesh, not an approximate smooth surface.
  const height = (x: number, z: number) => {
    const x0 = Math.floor(x / CELL) * CELL;
    const z0 = Math.floor(z / CELL) * CELL;
    const u = (x - x0) / CELL, v = (z - z0) / CELL;
    const a = vertexHeight(x0, z0), b = vertexHeight(x0 + CELL, z0);
    const c = vertexHeight(x0, z0 + CELL), d = vertexHeight(x0 + CELL, z0 + CELL);
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - v) * (b - d) + (1 - u) * (c - d);
  };
  return { vertexHeight, height };
}

// Edit this array to add/move landmarks. Positions are absolute world coordinates.
export const INITIAL_OBJECTS: WorldObject[] = [
  { id: 'beacon-01', type: 'beacon', position: { x: -16, y: 0, z: -20 }, orientation: { x: 0, y: 0, z: 0 } },
  { id: 'rock-01', type: 'rock', position: { x: 20, y: 0, z: -12 }, orientation: { x: 0, y: 0.6, z: 0 } },
  { id: 'tower-01', type: 'tower', position: { x: 8, y: 0, z: -42 }, orientation: { x: 0, y: 0.3, z: 0 } },
].map(object => ({ ...object, position: { ...object.position, y: createTerrain(SEED).height(object.position.x, object.position.z) } })) as WorldObject[];

export function createWorld(seed = SEED, objects: WorldObject[] = INITIAL_OBJECTS) {
  const terrain = createTerrain(seed);
  const player = { position: { x: 0, y: terrain.height(0, 12) + 5, z: 12 }, orientation: { x: 0, y: 0, z: 0 } };
  const landmarks = structuredClone(objects);
  const reset = () => {
    Object.assign(player.position, { x: 0, y: terrain.height(0, 12) + 5, z: 12 });
    Object.assign(player.orientation, { x: 0, y: 0, z: 0 });
  };
  function update(dt: number, keys: ReadonlySet<string>) {
    dt = Math.max(0, Math.min(dt, 0.05));
    const axis = (positive: string, negative: string) => Number(keys.has(positive)) - Number(keys.has(negative));
    player.orientation.y += axis('KeyA', 'KeyD') * dt * 1.8;
    const forward = axis('KeyW', 'KeyS'), strafe = axis('KeyE', 'KeyQ');
    const scale = 18 * dt / Math.max(1, Math.hypot(forward, strafe));
    const yaw = player.orientation.y;
    player.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * scale;
    player.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * scale;
    const bound = SIZE / 2 - 2;
    player.position.x = Math.max(-bound, Math.min(bound, player.position.x));
    player.position.z = Math.max(-bound, Math.min(bound, player.position.z));
    player.position.y += (Number(keys.has('Space')) - Number(keys.has('ShiftLeft') || keys.has('ShiftRight'))) * 12 * dt;
    player.position.y = Math.max(terrain.height(player.position.x, player.position.z) + 1.5, Math.min(65, player.position.y));
  }
  return { player, objects: landmarks, terrainHeight: terrain.height, update, reset,
    inspect: () => structuredClone({ seed, player, objects: landmarks }) };
}
export type World = ReturnType<typeof createWorld>;
