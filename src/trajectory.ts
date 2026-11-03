import type { NavigationStatus, Vector, World } from './world';
export type Sample = {
  time: number;
  position: Vector;
  orientation: Vector;
};
export type Segment = {
  id: number;
  command: {
    name: string;
    args: unknown[];
  };
  destination?: Vector;
  outcome: 'active' | 'completed' | 'interrupted' | 'blocked';
  samples: Sample[];
  events: {
    time: number;
    state: string;
  }[];
};
export type TrajectoryHistory = {
  version: 1;
  units: 'seconds';
  startedAt: string;
  segments: Segment[];
};
export interface TrajectoryAPI {
  start(): void;
  stop(): void;
  clear(): void;
  getHistory(): TrajectoryHistory;
  setVisible(visible: boolean): void;
}

function observeCommands(world: World, begin: (name: string, args: unknown[]) => void) {
  const commands = new Set([
    'executeRoute',
    'moveTo',
    'moveBy',
    'turnBy',
    'lookAt',
    'setControls',
    'stop',
    'setPlayerPosition',
    'setPlayerOrientation',
    'reset',
  ]);

  return Object.freeze(
    Object.fromEntries(
      Object.entries(world.interact).map(([name, method]) => [
        name,
        (...args: unknown[]) => {
          const result = (method as (...args: unknown[]) => unknown)(...args);

          if (commands.has(name)) {
            begin(name, args);
          }

          return result;
        },
      ]),
    ),
  ) as World['interact'];
}

function createAPI(
  recorder: {
    start(): void;
    stop(): void;
    clear(): void;
    getHistory(): TrajectoryHistory;
    getState(): {
      recording: boolean;
      visible: boolean;
      destinationsVisible: boolean;
    };
    changed(): void;
  },
  view: {
    visible: boolean;
    destinations: boolean;
  },
) {
  return {
    start: recorder.start,
    stop: recorder.stop,
    clear: recorder.clear,
    getHistory: recorder.getHistory,
    getState: recorder.getState,
    exportJSON: () => JSON.stringify(recorder.getHistory(), null, 2),
    setVisible(visible: boolean) {
      view.visible = visible;
    },
    setDestinationsVisible(visible: boolean) {
      view.destinations = visible;
      recorder.changed();
    },
  };
}

function appendSegment(history: TrajectoryHistory, segment: Segment, limit: number) {
  history.segments.push(segment);

  if (history.segments.length > limit) {
    history.segments.shift();
  }
}

function appendSample(active: Segment, value: Sample, maxSamples: number) {
  if (active.samples.at(-1)?.time === value.time) {
    active.samples[active.samples.length - 1] = value;
  } else {
    active.samples.push(value);
  }
  if (active.samples.length > maxSamples) {
    active.samples.shift();
  }
}

function fresh(): TrajectoryHistory {
  return { version: 1, units: 'seconds', startedAt: new Date().toISOString(), segments: [] };
}

function trajectoryLimits(options: { interval?: number; maxSegments?: number; maxSamples?: number }) {
  const interval = options.interval ?? 0.1;
  const maxSegments = options.maxSegments ?? 64;
  const maxSamples = options.maxSamples ?? 1000;
  const validCounts = [maxSegments, maxSamples - 1].every((value) => Number.isInteger(value) && value >= 1);

  if (!(interval > 0 && Number.isFinite(interval)) || !validCounts) {
    throw new Error('Invalid trajectory limits');
  }

  return { interval, maxSegments, maxSamples };
}
// Resume manual motion without joining it to a completed trip.
function hasMoved(world: World, history: TrajectoryHistory) {
  const p = world.player;
  const last = history.segments.at(-1)?.samples.at(-1);

  return (
    !last ||
    JSON.stringify(last.position) !== JSON.stringify(p.position) ||
    JSON.stringify(last.orientation) !== JSON.stringify(p.orientation)
  );
}

type RecorderState = {
  world: World;
  interval: number;
  maxSegments: number;
  maxSamples: number;
  time: number;
  nextSample: number;
  recording: boolean;
  id: number;
  revision: number;
  active?: Segment;
  status: NavigationStatus['state'];
  history: TrajectoryHistory;
};
function sampleRecorder(state: RecorderState) {
  if (!state.active) {
    return;
  }
  const player = state.world.player;

  appendSample(
    state.active,
    {
      time: state.time,
      position: { ...player.position },
      orientation: { ...player.orientation },
    },
    state.maxSamples,
  );
  state.revision++;
}

function finishRecordingSegment(state: RecorderState, outcome: Segment['outcome']) {
  if (!state.active) {
    return;
  }

  sampleRecorder(state);
  state.active.outcome = outcome;
  state.active.events.push({ time: state.time, state: outcome });
  state.active = undefined;
  state.revision++;
}

function beginRecordingSegment(state: RecorderState, name: string, args: unknown[]) {
  finishRecordingSegment(state, 'interrupted');
  const nav = state.world.interact.getNavigationStatus();

  state.status = nav.state;
  state.active = {
    id: ++state.id,
    command: { name, args: structuredClone(args) },
    ...(nav.target ? { destination: { ...nav.target } } : {}),
    outcome: 'active',
    samples: [],
    events: [{ time: state.time, state: nav.state }],
  };
  appendSegment(state.history, state.active, state.maxSegments);
  sampleRecorder(state);
  state.nextSample = state.time + state.interval;
}

function observeNavigation(state: RecorderState) {
  const nav = state.world.interact.getNavigationStatus();

  if (!state.active || state.status === nav.state) {
    return;
  }

  state.active.events.push({ time: state.time, state: nav.state });
  state.status = nav.state;
  state.revision++;
  const outcomes = { arrived: 'completed', blocked: 'blocked', failed: 'blocked', idle: 'interrupted' } as const;

  if (nav.state !== 'moving') {
    finishRecordingSegment(state, outcomes[nav.state]);
  }
}
// Observes successful public commands and post-update snapshots; never steers the world.
export function createTrajectory(
  world: World,
  options: {
    interval?: number;
    maxSegments?: number;
    maxSamples?: number;
  } = {},
) {
  const state: RecorderState = {
    world,
    ...trajectoryLimits(options),
    time: 0,
    nextSample: 0,
    recording: false,
    id: 0,
    revision: 0,
    status: 'idle',
    history: fresh(),
  };
  const interact = observeCommands(world, (name, args) => {
    if (state.recording) {
      beginRecordingSegment(state, name, args);
    }
  });
  const view = {
    visible: true,
    destinations: true,
    get revision() {
      return state.revision;
    },
  };
  const api = createAPI(
    {
      start() {
        if (!state.recording) {
          state.recording = true;
          beginRecordingSegment(state, 'recordingStarted', []);
        }
      },
      stop() {
        if (state.recording) {
          finishRecordingSegment(state, 'interrupted');
          state.recording = false;
        }
      },
      clear() {
        state.active = undefined;
        state.history = fresh();
        state.revision++;
      },
      getHistory: () => structuredClone(state.history),
      getState: () => ({ recording: state.recording, visible: view.visible, destinationsVisible: view.destinations }),
      changed() {
        state.revision++;
      },
    },
    view,
  );

  function update(dt: number) {
    state.time += Math.max(0, Math.min(dt, 0.05));

    if (!state.recording) {
      return;
    }

    observeNavigation(state);

    if (!state.active && hasMoved(world, state.history)) {
      beginRecordingSegment(state, 'movement', []);
    }
    if (state.active && state.time >= state.nextSample) {
      sampleRecorder(state);
      state.nextSample = state.time + state.interval;
    }
  }

  return { api, interact, update, view };
}
