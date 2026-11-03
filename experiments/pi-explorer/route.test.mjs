import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldBrowser } from './core.mjs';

const args = {
  waypoints: [
    { x: 1, y: 2, z: 3 },
    { x: 4, y: 2, z: 3 },
  ],
};

function fixture(states) {
  const browser = new WorldBrowser({});
  let route = { id: 1, commandIds: [1, 2], state: 'moving', completed: 0, outcomes: [] };
  const calls = [];

  browser.browser = { isConnected: () => true, close: async () => {} };
  browser.page = {
    isClosed: () => false,
    evaluate: async (_fn, input) => {
      calls.push(input.name);

      if (input.name === 'execute_route') {
        return { accepted: true, id: 1, commandIds: [1, 2] };
      }
      if (input.name === 'navigation_status') {
        route = { ...route, ...states.shift() };

        return { route, outcomes: route.outcomes };
      }

      route = { ...route, state: 'cancelled', outcomes: [1, 2].map((id) => ({ id, outcome: 'cancelled' })) };

      return route;
    },
  };

  return { browser, calls };
}

test('route waits across ticks and returns completion and ordered outcomes', async () => {
  const outcomes = [1, 2].map((id) => ({ id, outcome: 'arrived' }));
  const { browser, calls } = fixture([{ state: 'moving' }, { state: 'arrived', completed: 2, outcomes }]);
  const result = await browser.call('execute_route', args);

  assert.equal(result.details.state, 'completed');
  assert.equal(result.details.completed, 2);
  assert.deepEqual(result.details.outcomes, outcomes);
  assert.equal(calls.filter((name) => name === 'execute_route').length, 1);
});

for (const state of ['blocked', 'failed', 'cancelled', 'interrupted']) {
  test(`route returns ${state} with partial results`, async () => {
    const outcomes = [
      { id: 1, outcome: 'arrived' },
      { id: 2, outcome: state },
    ];
    const { browser } = fixture([{ state, completed: 1, outcomes }]);
    const { details } = await browser.call('execute_route', args);

    assert.equal(details.state, state);
    assert.equal(details.completed, 1);
    assert.deepEqual(details.outcomes, outcomes);
  });
}

for (const mode of ['cancellation', 'shutdown', 'timeout']) {
  test(`pending route settles on ${mode}`, async () => {
    const { browser } = fixture([]);
    const controller = new AbortController();
    const pending = browser.call('execute_route', args, {
      signal: controller.signal,
      timeoutMs: mode === 'timeout' ? 20 : 1000,
    });

    if (mode === 'cancellation') {
      controller.abort();
    }
    if (mode === 'shutdown') {
      await browser.close();
    }
    const { details } = await pending;

    assert.equal(details.state, { cancellation: 'cancelled', shutdown: 'interrupted', timeout: 'failed' }[mode]);
    assert.equal(details.outcomes.length, 2);
  });
}

test('replacement summary does not cause waiting for another route', async () => {
  const { browser } = fixture([{ id: 99 }]);

  assert.equal((await browser.call('execute_route', args)).details.state, 'interrupted');
});

test('unresponsive renderer cannot strand submission or cleanup', async () => {
  const { browser } = fixture([]);

  browser.page.evaluate = () => new Promise(() => {});
  const { details } = await browser.call('execute_route', args, { timeoutMs: 10 });

  assert.equal(details.state, 'failed');
  assert.equal(details.reason, 'Route wait timed out');
  assert.deepEqual(details.outcomes, []);
});

test('queued move_to still returns immediately', async () => {
  const { browser } = fixture([]);

  browser.page.evaluate = async () => ({ accepted: true, id: 3 });
  assert.deepEqual((await browser.call('move_to', { ...args.waypoints[0], queue: true })).details, {
    accepted: true,
    id: 3,
  });
});
