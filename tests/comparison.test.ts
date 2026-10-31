import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groups, loadRun, measurements, sessionEvents } from '../src/comparison-data';

test('comparison keeps missing measurements unavailable and partial files isolated', async () => {
  const run = await loadRun('partial', [new File(['bad'], 'trajectory.json'), new File(['{"type":"message","message":{"role":"assistant","content":[{"type":"toolCall","name":"inspect_world"}]}}'], 'session.jsonl')]);
  assert.equal(run.warnings.length, 1);
  assert.equal(measurements(run).distance, 'Unavailable');
  assert.equal(measurements(run).toolCalls, 1);
  assert.match(sessionEvents(run)[0].label, /Requested action: inspect_world/);
});
test('comparison computes only retained movement and keeps evidence', async () => {
  const segment = { id: 1, command: { name: 'moveTo', args: [] }, outcome: 'blocked', events: [], samples: [0, 2].map(time => ({ time, position: { x: time, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 } })) };
  const run = await loadRun('run', [new File([JSON.stringify({ version: 1, units: 'seconds', startedAt: 'now', segments: [segment] })], 'trajectory.json')]);
  assert.equal(measurements(run).distance, 2);
  assert.equal(measurements(run).duration, 2);
  assert.equal(measurements(run).blocked, 1);
  assert.equal(measurements(run).toolCalls, 'Unavailable');
  assert.deepEqual(run.history?.segments[0], segment);
});
test('loose files form an explicit run, directories stay separate', () => {
  const a = new File([''], 'session.jsonl');
  const b = new File([''], 'trajectory.json');
  assert.equal(groups([a, b]).size, 1);
  Object.defineProperty(a, 'webkitRelativePath', { value: 'exports/a/session.jsonl' });
  Object.defineProperty(b, 'webkitRelativePath', { value: 'exports/b/trajectory.json' });
  assert.equal(groups([a, b]).size, 2);
});
