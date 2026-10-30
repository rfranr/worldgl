import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/world';
import { createTrajectory } from '../src/trajectory';

function setup(options = {}) {
  const world = createWorld();
  const recorder = createTrajectory(world, options);
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { world.update(0.05, new Set()); recorder.update(0.05); } };
  return { world, recorder, tick };
}
test('debug state reflects console and panel controls without changing exported format', () => {
  const { recorder: r } = setup();
  assert.deepEqual(r.api.getState(), { recording: false, visible: true, destinationsVisible: true });
  r.api.start();
  const history = r.api.exportJSON();
  r.api.setVisible(false);
  r.api.setDestinationsVisible(false);
  assert.deepEqual(r.api.getState(), { recording: true, visible: false, destinationsVisible: false });
  assert.equal(r.api.exportJSON(), history);
  r.api.getState().recording = false;
  assert.equal(r.api.getState().recording, true);
  r.api.stop();
  assert.equal(r.api.getState().recording, false);
});

test('opt-in recording, periodic samples, orientation and detached serializable export', () => {
  const { recorder: r, tick } = setup({ interval: 0.2 });
  tick(10);
  assert.equal(r.api.getHistory().segments.length, 0);
  r.api.start();
  r.interact.setControls({ forward: 1, turn: 0.5 });
  tick(20);
  const h = r.api.getHistory();
  const samples = h.segments.at(-1)!.samples;
  assert.ok(samples.length >= 5 && samples.length <= 6);
  assert.ok(samples.at(-1)!.orientation.y > samples[0].orientation.y);
  assert.deepEqual(JSON.parse(r.api.exportJSON()), h);
  h.segments.length = 0;
  assert.ok(r.api.getHistory().segments.length);
  r.api.stop();
  const stopped = r.api.exportJSON();
  tick(10);
  assert.equal(r.api.exportJSON(), stopped);
});
test('successive identical commands remain separate; arrivals, interruptions and blocks are retained', () => {
  const { world, recorder: r, tick } = setup();
  r.api.start();
  const p = { ...world.player.position };
  r.interact.moveTo(p);
  r.interact.moveTo(p);
  tick();
  r.interact.moveTo({ ...p, y: -60 });
  tick();
  const segments = r.api.getHistory().segments;
  assert.deepEqual(segments.slice(-3).map(s => s.outcome), ['interrupted', 'completed', 'blocked']);
  assert.ok(segments.at(-2)!.events.some(e => e.state === 'arrived'));
  assert.ok(segments.at(-1)!.events.some(e => e.state === 'blocked'));
  assert.deepEqual(segments.at(-1)!.destination, { ...p, y: -60 });
});
test('keyboard interruption, bounded histories and clear without world reset', () => {
  const { world, recorder: r, tick } = setup({ maxSegments: 3, maxSamples: 4 });
  r.api.start();
  for (let i = 0; i < 6; i++) r.interact.moveBy({ forward: 20 });
  world.update(0.05, new Set(['KeyW'])); r.update(0.05);
  assert.equal(r.api.getHistory().segments.at(-1)!.outcome, 'interrupted');
  r.interact.setControls({ forward: 1 });
  tick(100);
  assert.ok(r.api.getHistory().segments.length <= 3);
  assert.ok(r.api.getHistory().segments.every(s => s.samples.length <= 4));
  r.api.stop();
  const before = world.inspect();
  r.api.clear();
  assert.deepEqual(r.api.getHistory().segments, []);
  assert.deepEqual(world.inspect(), before);
});
