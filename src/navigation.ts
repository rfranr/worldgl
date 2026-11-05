import type { NavigationCommand, NavigationOutcome, NavigationStatus, Vector } from './world-model';
import { position, turnTowards, type Height, type Player } from './flight';
import { createMotion } from './navigation-motion';
function validateRequest(
  target: Vector,
  options: {
    queue?: boolean;
  },
  pendingCount: number,
) {
  position(target);

  if (typeof options.queue !== 'undefined' && typeof options.queue !== 'boolean') {
    throw new Error('queue must be boolean');
  }
  if (options.queue && pendingCount >= 64) {
    throw new Error('Navigation queue full');
  }
}

function snapshot(status: NavigationStatus, initialDistance: number, distanceTo: (target: Vector) => number) {
  const result = structuredClone(status);

  if (status.target) {
    const distanceRemaining = distanceTo(status.target);

    result.progress = { distanceRemaining, fraction: Math.max(0, 1 - distanceRemaining / (initialDistance || 1)) };
  }

  return result;
}

function recordRoute(route: NonNullable<NavigationStatus['route']>, result: NavigationOutcome) {
  route.outcomes.push(result);

  if (result.outcome === 'arrived') {
    route.completed++;
  }
  if (route.state === 'moving' && result.outcome !== 'arrived') {
    route.state = result.outcome;
  }
  if (route.completed === route.commandIds.length) {
    route.state = 'arrived';
  }
}

function record(status: NavigationStatus, command: NavigationCommand, outcome: NavigationOutcome['outcome']) {
  const result: NavigationOutcome = { ...command, outcome };

  if (outcome === 'blocked') {
    result.blockage = structuredClone(status.blockage);
  }

  status.outcomes.push(result);

  if (status.route?.commandIds.includes(command.id)) {
    recordRoute(status.route, result);
  }

  status.outcomes = status.outcomes.slice(-100);
}

function finish(status: NavigationStatus, start: (command: NavigationCommand) => void) {
  if (status.state === 'moving') {
    return;
  }
  const outcome = status.state as 'arrived' | 'blocked' | 'failed';

  record(status, status.active!, outcome);
  status.active = undefined;

  if (outcome !== 'arrived') {
    for (const command of status.pending) {
      record(status, command, 'cancelled');
    }
    status.pending = [];
  }
  const next = status.pending.shift();

  if (next) {
    start(next);
  }
}

function submitRoute(
  waypoints: Vector[],
  stop: () => void,
  moveTo: (
    target: Vector,
    options: {
      queue: boolean;
    },
  ) => {
    id: number;
  },
) {
  if (!Array.isArray(waypoints) || waypoints.length === 0 || waypoints.length > 65) {
    throw new Error('Route requires 1 to 65 waypoints');
  }

  for (const target of waypoints) {
    position(target);
  }
  stop();
  const commandIds = waypoints.map((target) => moveTo(target, { queue: true }).id);

  return { id: commandIds[0], commandIds };
}

function cancelCommands(status: NavigationStatus, outcome: 'cancelled' | 'interrupted'): NavigationStatus {
  if (status.active) {
    record(status, status.active, outcome);
  }

  for (const command of status.pending) {
    record(status, command, outcome);
  }

  return { state: 'idle', pending: [], outcomes: status.outcomes, route: status.route };
}

export function createNavigation(player: Player, height: Height) {
  let status: NavigationStatus = { state: 'idle', pending: [], outcomes: [] };
  let nextId = 1;
  let initialDistance = 0;
  const motion = createMotion(player, height);

  function clear(outcome: 'cancelled' | 'interrupted') {
    status = cancelCommands(status, outcome);
    rotation = undefined;
  }
  let rotation: number | undefined;

  function stop() {
    clear('interrupted');
  }
  function start(command: NavigationCommand) {
    delete status.blockage;
    status.state = 'moving';
    status.active = command;
    status.target = command.target;
    initialDistance = motion.start(command.target);
  }
  function moveTo(target: Vector, options: { queue?: boolean } = {}) {
    validateRequest(target, options, status.pending.length);

    if (!options.queue) {
      stop();
    }
    const command = { id: nextId++, target: { x: target.x, y: target.y, z: target.z } };

    if (status.active) {
      status.pending.push(command);
    } else {
      rotation = undefined;
      start(command);
    }

    return { accepted: true, id: command.id };
  }
  function executeRoute(waypoints: Vector[]) {
    const route = submitRoute(waypoints, stop, moveTo);

    status.route = { ...route, outcomes: [], completed: 0, state: 'moving' };

    return { accepted: true, ...route };
  }
  function update(dt: number) {
    if (status.state === 'moving') {
      status.state = motion.step(status.target!, dt);
      status.blockage = motion.getBlockage();
      finish(status, start);

      return true;
    }
    if (rotation === undefined) {
      return false;
    }
    if (turnTowards(player, rotation, dt)) {
      rotation = undefined;
    }

    return true;
  }

  return {
    stop,
    abort: () => clear('cancelled'),
    moveTo,
    executeRoute,
    update,
    getStatus: () => snapshot(status, initialDistance, motion.distanceTo),
    rotate(target: number) {
      stop();
      rotation = target;
    },
  };
}
