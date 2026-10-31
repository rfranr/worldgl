import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldBrowser, validate, names, worldOperation, format } from './core.mjs';

test('strict finite arguments and bounds', () => {
  const valid = {
    execute_route: { waypoints: [{ x: 0, y: 2, z: 3 }] },
    move_to: { x: 0, y: 2, z: 3 },
    look_at: { x: 0, y: 2, z: 3 },
    turn_by: { radians: 1 },
  };
  for (const name of names) validate(name, valid[name] ?? {});
  for (const args of [null, [], { forward: NaN }, { right: Infinity }, { up: '1' }, { script: 'x' }]) assert.throws(() => validate('move_by', args));
  for (const args of [{}, { x: 119, y: 0, z: 0 }, { x: 0, y: -66, z: 0 }]) assert.throws(() => validate('move_to', args));
  for (const args of [{}, { waypoints: [] }, { waypoints: [{ x: 119, y: 2, z: 0 }] }, { waypoints: [{ x: 0, y: 2, z: 0, queue: true }] }]) assert.throws(() => validate('execute_route', args));
  assert.throws(() => validate('inspect_world', { x: 1 }));
  assert.throws(() => validate('eval', {}));
});

test('all eight fixed API mappings and response formatting', async () => {
  const calls = [];
  globalThis.window = { world: {
    inspect: () => { calls.push(['inspect']); return { seed: 213 }; },
    interact: {
      moveBy: args => calls.push(['moveBy', args]), moveTo: args => calls.push(['moveTo', args]),
      executeRoute: waypoints => { calls.push(['executeRoute', waypoints]); return { accepted: true, id: 42, commandIds: [42, 43] }; },
      getNavigationStatus: () => { calls.push(['status']); return { state: 'arrived', route: { id: 42, commandIds: [42, 43], state: 'arrived', completed: 2, outcomes: [{ id: 42, outcome: 'arrived' }, { id: 43, outcome: 'arrived' }] } }; },
      stop: () => calls.push(['stop']),
      turnBy: args => calls.push(['turnBy', args]), lookAt: args => calls.push(['lookAt', args]),
    },
  } };
  const browser = new WorldBrowser({});
  browser.browser = { isConnected: () => true };
  browser.page = { isClosed: () => false, evaluate: (fn, args) => fn(args) };
  try {
    const fixtures = {
      inspect_world: [{}, { seed: 213 }],
      move_by: [{ forward: 2 }, { accepted: true }],
      move_to: [{ x: 1, y: 2, z: 3 }, { accepted: true }],
      execute_route: [{ waypoints: [{ x: 1, y: 2, z: 3 }, { x: 4, y: 2, z: 3 }] }, { id: 42, commandIds: [42, 43], state: 'completed', completed: 2, outcomes: [{ id: 42, outcome: 'arrived' }, { id: 43, outcome: 'arrived' }] }],
      navigation_status: [{}, { state: 'arrived', route: { id: 42, commandIds: [42, 43], state: 'arrived', completed: 2, outcomes: [{ id: 42, outcome: 'arrived' }, { id: 43, outcome: 'arrived' }] } }],
      stop_movement: [{}, { stopped: true }],
      turn_by: [{ radians: Math.PI / 2 }, { accepted: true }],
      look_at: [{ x: 10, y: 20, z: 30 }, { accepted: true }],
    };
    assert.deepEqual([...names].sort(), Object.keys(fixtures).sort());
    for (const name of names) {
      const [input, expected] = fixtures[name];
      assert.deepEqual(await browser.call(name, input), format(expected));
    }
    assert.deepEqual(calls, [['inspect'], ['moveBy', fixtures.move_by[0]], ['moveTo', fixtures.move_to[0]], ['executeRoute', fixtures.execute_route[0].waypoints], ['status'], ['status'], ['stop'], ['turnBy', fixtures.turn_by[0]], ['lookAt', fixtures.look_at[0]]]);
    assert.equal(format({ ok: true }).content[0].text, '{"ok":true}');
    assert.throws(() => worldOperation({ name: 'eval', args: {} }));
  } finally { delete globalThis.window; }
});

test('disconnections, mid-call closure, API errors and idempotent cleanup', async () => {
  const browser = new WorldBrowser({});
  await assert.rejects(browser.call('inspect_world', {}), /disconnected/);
  let connected = true, closed = false, closes = 0;
  browser.browser = { isConnected: () => connected, close: async () => { closes++; } };
  browser.page = { isClosed: () => closed, evaluate: async () => { throw new Error('API unavailable'); } };
  await assert.rejects(browser.call('inspect_world', {}), /World operation failed: API unavailable/);
  browser.page.evaluate = async () => { connected = false; throw new Error('Target closed'); };
  await assert.rejects(browser.call('inspect_world', {}), /disconnected/);
  connected = true; closed = true;
  await assert.rejects(browser.call('inspect_world', {}), /page closed/);
  await browser.close(); await browser.close(); assert.equal(closes, 1);
});
