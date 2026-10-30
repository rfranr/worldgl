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

export type FlightControls = { forward: number; turn: number; strafe: number; vertical: number };
export type NavigationStatus = { state: 'idle' | 'moving' | 'arrived' | 'blocked'; target?: Vector };
const zeroControls = (): FlightControls => ({ forward: 0, turn: 0, strafe: 0, vertical: 0 });
const finite = (n: number) => { if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error('Expected finite number'); };
function vector(v: Vector) { if (!v) throw new Error('Expected vector'); finite(v.x); finite(v.y); finite(v.z); }
const BOUND = SIZE / 2 - 2;
function position(v: Vector) {
  vector(v);
  if (Math.abs(v.x) > BOUND || Math.abs(v.z) > BOUND || v.y > 65 || v.y < -65) throw new Error('Position outside world bounds');
}

export function createWorld(seed = SEED, objects: WorldObject[] = INITIAL_OBJECTS, now = () => performance.now()) {
  const terrain = createTerrain(seed);
  const player = { position: { x: 0, y: terrain.height(0, 12) + 5, z: 12 }, orientation: { x: 0, y: 0, z: 0 } };
  const landmarks = structuredClone(objects);
  const initialObjects = structuredClone(objects);
  let controls = zeroControls(), timeout = 2000, refreshed = 0;
  let navigation: NavigationStatus = { state: 'idle' };
  // Only reductions beyond this threshold count; jitter must not keep a trip alive.
  const progressThreshold = 0.05, inactivityLimit = 5;
  let inactiveTime = 0, progressDistance = Infinity;
  let rotation: number | undefined;
  const angularSpeed = 1.8;
  const headingTo = (target: Vector) => {
    const dx = target.x - player.position.x, dz = target.z - player.position.z;
    return Math.hypot(dx, dz) > 1e-9 ? Math.atan2(-dx, -dz) : player.orientation.y;
  };
  const turnTowards = (target: number, dt: number) => {
    const delta = Math.atan2(Math.sin(target - player.orientation.y), Math.cos(target - player.orientation.y));
    const step = angularSpeed * dt;
    player.orientation.y += Math.max(-step, Math.min(step, delta));
    return Math.abs(delta) <= step;
  };
  const stop = () => { controls = zeroControls(); navigation = { state: 'idle' }; rotation = undefined; };
  const moveTo = (target: Vector) => {
    position(target);
    stop();
    navigation = { state: 'moving', target: { ...target } };
    inactiveTime = 0;
    progressDistance = Math.hypot(target.x - player.position.x, target.y - player.position.y, target.z - player.position.z);
  };
  const find = (id: string) => {
    const object = landmarks.find(o => o.id === id);
    if (!object) throw new Error('Unknown object ID');
    return object;
  };
  const reset = () => {
    stop();
    landmarks.splice(0, landmarks.length, ...structuredClone(initialObjects));
    Object.assign(player.position, { x: 0, y: terrain.height(0, 12) + 5, z: 12 });
    Object.assign(player.orientation, { x: 0, y: 0, z: 0 });
  };
  const interact = Object.freeze({
    setControls(patch: Partial<FlightControls>) {
      if (!patch || typeof patch !== 'object') throw new Error('Expected controls');
      for (const [key, value] of Object.entries(patch)) {
        if (!(key in zeroControls())) throw new Error('Unknown control');
        finite(value); if (Math.abs(value) > 1) throw new Error('Control outside -1..1');
      }
      navigation = { state: 'idle' }; rotation = undefined; controls = { ...controls, ...patch }; refreshed = now();
    },
    getControls() {
      if (now() - refreshed >= timeout) controls = zeroControls();
      return { ...controls };
    },
    setControlTimeout(milliseconds: number) {
      finite(milliseconds); if (milliseconds < 0) throw new Error('Negative timeout'); timeout = milliseconds;
    },
    moveTo,
    turnBy({ radians }: { radians: number }) {
      finite(radians);
      stop();
      rotation = player.orientation.y + radians;
    },
    lookAt(target: Vector) {
      vector(target);
      stop();
      rotation = headingTo(target);
    },
    moveBy(displacement: { forward?: number; right?: number; up?: number }) {
      if (!displacement || typeof displacement !== 'object') throw new Error('Expected displacement');
      for (const [key, value] of Object.entries(displacement)) {
        if (!['forward', 'right', 'up'].includes(key)) throw new Error('Unknown displacement');
        finite(value);
      }
      const { forward = 0, right = 0, up = 0 } = displacement;
      const yaw = player.orientation.y, p = player.position;
      moveTo({ x: p.x - Math.sin(yaw) * forward + Math.cos(yaw) * right,
        y: p.y + up, z: p.z - Math.cos(yaw) * forward - Math.sin(yaw) * right });
    },
    getNavigationStatus: (): NavigationStatus => structuredClone(navigation),
    stop,
    setPlayerPosition(p: Vector) {
      position(p); stop(); Object.assign(player.position, p);
      player.position.y = Math.max(p.y, terrain.height(p.x, p.z) + 1.5);
    },
    setPlayerOrientation(o: Vector) { vector(o); stop(); Object.assign(player.orientation, o); },
    addObject(object: WorldObject) {
      if (!object || typeof object.id !== 'string' || !object.id || landmarks.some(o => o.id === object.id)) throw new Error('Invalid or duplicate ID');
      if (!['rock', 'tower', 'beacon'].includes(object.type)) throw new Error('Unknown object type');
      position(object.position); vector(object.orientation);
      landmarks.push(structuredClone(object));
    },
    removeObject(id: string) { landmarks.splice(landmarks.indexOf(find(id)), 1); },
    moveObject(id: string, p: Vector) { position(p); find(id).position = { ...p }; },
    reset,
  });
  function update(dt: number, keys: ReadonlySet<string>) {
    finite(dt);
    dt = Math.max(0, Math.min(dt, 0.05));
    const axis = (positive: string, negative: string) => Number(keys.has(positive)) - Number(keys.has(negative));
    const keyboard = ['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight'].some(k => keys.has(k));
    if (keyboard) stop();
    if (navigation.state === 'moving') {
      inactiveTime += dt;
      const target = navigation.target!, p = player.position;
      const dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z;
      const distance = Math.hypot(dx, dy, dz);
      if (progressDistance - distance >= progressThreshold) {
        progressDistance = distance;
        inactiveTime = 0;
      }
      if (target.y < terrain.height(target.x, target.z) + 1.5) navigation.state = 'blocked';
      else if (distance <= 0.15) navigation.state = 'arrived';
      else if (inactiveTime >= inactivityLimit) navigation.state = 'blocked';
      else {
        turnTowards(headingTo(target), dt);
        const scale = Math.min(1, 12 * dt / distance);
        p.x += dx * scale; p.z += dz * scale; p.y += dy * scale;
        p.y = Math.max(p.y, terrain.height(p.x, p.z) + 1.5);
      }
      return;
    }
    if (rotation !== undefined) {
      if (turnTowards(rotation, dt)) rotation = undefined;
      return;
    }
    const input = keyboard ? {
      forward: axis('KeyW', 'KeyS'), turn: axis('KeyA', 'KeyD'), strafe: axis('KeyE', 'KeyQ'),
      vertical: Number(keys.has('Space')) - Number(keys.has('ShiftLeft') || keys.has('ShiftRight')),
    } : interact.getControls();
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
    player.position.y = Math.max(terrain.height(player.position.x, player.position.z) + 1.5, Math.min(65, player.position.y));
  }
  return { player, objects: landmarks, terrainHeight: terrain.height, update, reset, interact,
    inspect: () => structuredClone({ seed, player, objects: landmarks }) };
}
export type World = ReturnType<typeof createWorld>;
