import type { NavigationStatus, Vector, World } from './world';

export type Sample = { time: number; position: Vector; orientation: Vector };
export type Segment = {
  id: number; command: { name: string; args: unknown[] }; destination?: Vector;
  outcome: 'active' | 'completed' | 'interrupted' | 'blocked';
  samples: Sample[]; events: { time: number; state: string }[];
};
export type TrajectoryHistory = { version: 1; units: 'seconds'; startedAt: string; segments: Segment[] };
export interface TrajectoryAPI {
  start(): void; stop(): void; clear(): void; getHistory(): TrajectoryHistory;
  setVisible(visible: boolean): void;
}

// Observes successful public commands and post-update snapshots; never steers the world.
export function createTrajectory(world: World, options: { interval?: number; maxSegments?: number; maxSamples?: number } = {}) {
  const interval = options.interval ?? 0.1, maxSegments = options.maxSegments ?? 64, maxSamples = options.maxSamples ?? 1000;
  const validCounts = [maxSegments, maxSamples - 1].every(value => Number.isInteger(value) && value >= 1);
  if (!(interval > 0 && Number.isFinite(interval)) || !validCounts) throw new Error('Invalid trajectory limits');
  let time = 0, nextSample = 0, recording = false, id = 0, revision = 0;
  let active: Segment | undefined;
  let status: NavigationStatus['state'] = 'idle';
  let history: TrajectoryHistory = fresh();
  function fresh(): TrajectoryHistory { return { version: 1, units: 'seconds', startedAt: new Date().toISOString(), segments: [] }; }
  function sample() {
    if (!active) return;
    const value = { time, position: { ...world.player.position }, orientation: { ...world.player.orientation } };
    if (active.samples.at(-1)?.time === time) active.samples[active.samples.length - 1] = value;
    else active.samples.push(value);
    if (active.samples.length > maxSamples) active.samples.shift();
    revision++;
  }
  function finish(outcome: Segment['outcome']) {
    if (!active) return;
    sample(); active.outcome = outcome; active.events.push({ time, state: outcome }); active = undefined; revision++;
  }
  function begin(name: string, args: unknown[]) {
    finish('interrupted');
    const nav = world.interact.getNavigationStatus();
    status = nav.state;
    active = { id: ++id, command: { name, args: structuredClone(args) }, ...(nav.target ? { destination: { ...nav.target } } : {}), outcome: 'active', samples: [], events: [{ time, state: nav.state }] };
    history.segments.push(active);
    if (history.segments.length > maxSegments) history.segments.shift();
    sample(); nextSample = time + interval;
  }
  const commands = new Set(['moveTo', 'moveBy', 'turnBy', 'lookAt', 'setControls', 'stop', 'setPlayerPosition', 'setPlayerOrientation', 'reset']);
  const interact = Object.freeze(Object.fromEntries(Object.entries(world.interact).map(([name, method]) => [name, (...args: unknown[]) => {
    const result = (method as (...args: unknown[]) => unknown)(...args);
    if (recording && commands.has(name)) begin(name, args);
    return result;
  }]))) as World['interact'];
  const api = {
    start() { if (!recording) { recording = true; begin('recordingStarted', []); } },
    stop() { if (recording) { finish('interrupted'); recording = false; } },
    clear() { active = undefined; history = fresh(); revision++; },
    getHistory: () => structuredClone(history),
    getState: () => ({ recording, visible: view.visible, destinationsVisible: view.destinations }),
    exportJSON: () => JSON.stringify(history, null, 2),
    setVisible(visible: boolean) { view.visible = visible; },
    setDestinationsVisible(visible: boolean) { view.destinations = visible; revision++; },
  };
  const view = { visible: true, destinations: true, get revision() { return revision; } };
  function observeNavigation() {
    const nav = world.interact.getNavigationStatus();
    if (!active || status === nav.state) return;
    active.events.push({ time, state: nav.state }); status = nav.state; revision++;
    const outcomes = { arrived: 'completed', blocked: 'blocked', idle: 'interrupted' } as const;
    if (nav.state !== 'moving') finish(outcomes[nav.state]);
  }
  function update(dt: number) {
    time += Math.max(0, Math.min(dt, 0.05));
    if (!recording) return;
    observeNavigation();
    if (!active) {
      // Resume sampling manual motion without joining it to a completed trip.
      const p = world.player;
      const last = history.segments.at(-1)?.samples.at(-1);
      if (!last || JSON.stringify(last.position) !== JSON.stringify(p.position) || JSON.stringify(last.orientation) !== JSON.stringify(p.orientation)) begin('movement', []);
    }
    if (active && time >= nextSample) { sample(); nextSample = time + interval; }
  }
  return { api, interact, update, view };
}
