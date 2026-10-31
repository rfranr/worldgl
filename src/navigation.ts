import type { NavigationCommand, NavigationOutcome, NavigationStatus, Vector } from './world-model';
import { position, turnTowards, type Height, type Player } from './flight';
import { createMotion } from './navigation-motion';

function validateRequest(target: Vector, options: { queue?: boolean }, pendingCount: number) {
  position(target);
  if (typeof options.queue !== 'undefined' && typeof options.queue !== 'boolean') throw new Error('queue must be boolean');
  if (options.queue && pendingCount >= 64) throw new Error('Navigation queue full');
}
function snapshot(status: NavigationStatus, initialDistance: number, distanceTo: (target: Vector) => number) {
  const result = structuredClone(status);
  if (status.target) {
    const distanceRemaining = distanceTo(status.target);
    result.progress = { distanceRemaining, fraction: Math.max(0, 1 - distanceRemaining / (initialDistance || 1)) };
  }
  return result;
}
function record(status: NavigationStatus, command: NavigationCommand, outcome: NavigationOutcome['outcome']) {
  status.outcomes.push({ ...command, outcome });
  status.outcomes = status.outcomes.slice(-100);
}
export function createNavigation(player: Player, height: Height) {
  let status: NavigationStatus = { state: 'idle', pending: [], outcomes: [] };
  let nextId = 1, initialDistance = 0;
  const motion = createMotion(player, height);
  function clear(outcome: 'cancelled' | 'interrupted') {
    if (status.active) record(status, status.active, outcome);
    for (const command of status.pending) record(status, command, outcome);
    status = { state: 'idle', pending: [], outcomes: status.outcomes };
    rotation = undefined;
  }
  let rotation: number | undefined;
  function stop() { clear('interrupted'); }
  function start(command: NavigationCommand) {
    status.state = 'moving'; status.active = command; status.target = command.target;
    initialDistance = motion.start(command.target);
  }
  function moveTo(target: Vector, options: { queue?: boolean } = {}) {
    validateRequest(target, options, status.pending.length);
    if (!options.queue) stop();
    const command = { id: nextId++, target: { x: target.x, y: target.y, z: target.z } };
    if (status.active) status.pending.push(command);
    else { rotation = undefined; start(command); }
    return { accepted: true, id: command.id };
  }
  function finish() {
    if (status.state === 'moving') return;
    const outcome = status.state as 'arrived' | 'blocked' | 'failed';
    record(status, status.active!, outcome);
    status.active = undefined;
    if (outcome !== 'arrived') {
      for (const command of status.pending) record(status, command, 'cancelled');
      status.pending = [];
    }
    const next = status.pending.shift();
    if (next) start(next);
  }
  function update(dt: number) {
    if (status.state === 'moving') {
      status.state = motion.step(status.target!, dt);
      finish(); return true;
    }
    if (rotation === undefined) return false;
    if (turnTowards(player, rotation, dt)) rotation = undefined;
    return true;
  }
  return { stop, abort: () => clear('cancelled'), moveTo, update,
    getStatus: () => snapshot(status, initialDistance, motion.distanceTo),
    rotate(target: number) { stop(); rotation = target; } };
}
