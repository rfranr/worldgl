import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldBrowser, validate, names, worldOperation, format } from './core.mjs';

test('strict finite arguments and bounds', () => {
  for (const name of names) validate(name, {}[name] ?? (name === 'move_to' ? { x: 0, y: 2, z: 3 } : {}));
  for (const args of [null, [], { forward: NaN }, { right: Infinity }, { up: '1' }, { script: 'x' }]) assert.throws(() => validate('move_by', args));
  for (const args of [{}, { x: 119, y: 0, z: 0 }, { x: 0, y: -66, z: 0 }]) assert.throws(() => validate('move_to', args));
  assert.throws(() => validate('inspect_world', { x: 1 }));
  assert.throws(() => validate('eval', {}));
});

test('all five fixed API mappings and response formatting', async () => {
  const calls = [];
  globalThis.window = { world: {
    inspect: () => { calls.push(['inspect']); return { seed: 213 }; },
    interact: {
      moveBy: args => calls.push(['moveBy', args]), moveTo: args => calls.push(['moveTo', args]),
      getNavigationStatus: () => { calls.push(['status']); return { state: 'moving' }; },
      stop: () => calls.push(['stop']),
    },
  } };
  const browser = new WorldBrowser({});
  browser.browser = { isConnected: () => true };
  browser.page = { isClosed: () => false, evaluate: (fn, args) => fn(args) };
  try {
    const inputs = [{}, { forward: 2 }, { x: 1, y: 2, z: 3 }, {}, {}];
    const expected = [{ seed: 213 }, { accepted: true }, { accepted: true }, { state: 'moving' }, { stopped: true }];
    for (let i = 0; i < names.length; i++) assert.deepEqual(await browser.call(names[i], inputs[i]), format(expected[i]));
    assert.deepEqual(calls, [['inspect'], ['moveBy', inputs[1]], ['moveTo', inputs[2]], ['status'], ['stop']]);
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
