import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Experiment bridge is plain JavaScript.
import { validate, worldOperation, names } from '../experiments/pi-explorer/core.mjs';
test('execute_route validates strict waypoints and forwards to the browser API', () => {
  const args = { waypoints: [{ x: 1, y: 2, z: 3 }] };
  assert.ok(names.includes('execute_route'));
  validate('execute_route', args);
  for (const invalid of [{}, { waypoints: [] }, { waypoints: [{ x: 119, y: 2, z: 0 }] }, { waypoints: [{ x: 0, y: 2, z: 0, queue: true }] }]) {
    assert.throws(() => validate('execute_route', invalid));
  }
  const globals = globalThis as unknown as { window?: unknown };
  globals.window = { world: { interact: { executeRoute: (points: unknown) => {
    assert.deepEqual(points, args.waypoints);
    return { accepted: true, id: 1 };
  } } } };
  try { assert.deepEqual(worldOperation({ name: 'execute_route', args }), { accepted: true, id: 1 }); }
  finally { delete globals.window; }
});
