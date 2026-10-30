import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metrics } from './export.mjs';
test('native usage, calls, errors and sampled distance', () => {
  const result = metrics([{ message: { role: 'assistant', provider: 'p', model: 'm', content: [{ type: 'toolCall', name: 'move_to' }], usage: { input: 12, cost: { total: 0.2 } } } }, { message: { role: 'toolResult', isError: true } }], { segments: [{ outcome: 'blocked', samples: [{ position: { x: 0, y: 0, z: 0 } }, { position: { x: 3, y: 4, z: 0 } }] }] });
  assert.equal(result.navigation.distance, 5);
  assert.equal(result.toolCalls.move_to, 1);
  assert.equal(result.toolErrors, 1);
  assert.equal(result.usage.cost.total, 0.2);
  assert.deepEqual(metrics([], null).usage, {});
});
