import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSession, parseTrajectory, sessionSummary, analyzeTrajectory, association } from '../src/inspector-data';
const sample = (time: number, x: number) => ({ time, position: { x, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 } });
const history = () => ({ version: 1, units: 'seconds', startedAt: '2026-01-01', segments: [{ id: 1, command: { name: 'moveTo', args: [] }, outcome: 'completed', samples: [sample(2, 0), sample(5, 4)], events: [] }] });
test('validates and analyzes retained trajectory samples', () => {
  assert.deepEqual(analyzeTrajectory(parseTrajectory(history())), { distance: 4, duration: 3, outcomes: { completed: 1 } });
});
test('rejects unsupported and malformed trajectories', () => {
  assert.throws(() => parseTrajectory({ ...history(), version: 2 }));
  const value = history(); value.segments[0].samples[1].position.x = Infinity;
  assert.throws(() => parseTrajectory(value));
  value.segments[0].samples = [sample(5, 0), sample(2, 1)];
  assert.throws(() => parseTrajectory(value));
  assert.throws(() => parseTrajectory(null));
});
test('partial JSONL preserves valid entries and untrusted text without execution', () => {
  const message = { role: 'user', content: '<script>alert(1)</script>' };
  const parsed = parseSession(`${JSON.stringify({ type: 'message', message })}\n{broken\n`);
  assert.equal(parsed.entries.length, 1); assert.equal(parsed.warnings.length, 1);
  assert.equal(sessionSummary(parsed.entries).task, message.content);
});
test('summarizes models and tool usage including incomplete calls', () => {
  const summary = sessionSummary([{ type: 'model_change', modelId: 'example' }, { message: { role: 'assistant', content: [{ type: 'toolCall', id: 'a', name: 'move_to', arguments: {} }] } }]);
  assert.deepEqual(summary.models, ['example']); assert.deepEqual(summary.tools, { move_to: 1 });
  assert.match(association(), /^Unknown:/);
});
test('empty histories have unknown duration and no invented distance', () => {
  assert.deepEqual(analyzeTrajectory(parseTrajectory({ ...history(), segments: [] })), { distance: 0, duration: null, outcomes: {} });
});
