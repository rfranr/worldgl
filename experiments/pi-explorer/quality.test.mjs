import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { WorldBrowser, worldOperation } from './core.mjs';
import { ExperimentExport, metrics } from './export.mjs';

function connectedBrowser(evaluate) {
  const browser = new WorldBrowser({});

  browser.browser = { isConnected: () => true, close: async () => {} };
  browser.page = { isClosed: () => false, evaluate };

  return browser;
}

test('adapter lint recognizes runtime globals but still catches undeclared names', async () => {
  const eslint = new ESLint();
  const corePath = fileURLToPath(new URL('./core.mjs', import.meta.url));
  const launchPath = fileURLToPath(new URL('./launch.mjs', import.meta.url));
  const [valid] = await eslint.lintText(
    'export const runtime = [process, console, URL, AbortController, AbortSignal, setTimeout, clearTimeout, window];',
    { filePath: corePath },
  );

  assert.equal(valid.errorCount, 0);
  const [invalid] = await eslint.lintText('export const runtime = missingWorld;', { filePath: corePath });

  assert.equal(invalid.messages[0].ruleId, 'no-undef');
  const [nodeOnly] = await eslint.lintText('export const runtime = window;', { filePath: launchPath });

  assert.equal(nodeOnly.messages[0].ruleId, 'no-undef');
});

test('startup and API errors retain their original causes', async () => {
  const cause = new Error('renderer unavailable');
  const browser = new WorldBrowser({
    launch: async () => {
      throw cause;
    },
  });

  await assert.rejects(browser.start(), { cause, message: /Could not open worldgl/ });
  const connected = connectedBrowser(async () => {
    throw cause;
  });

  await assert.rejects(connected.call('inspect_world', {}), { cause, message: /World operation failed/ });
});

test('closing during an API call reports disconnection without a secondary TypeError', async () => {
  let rejectEvaluation;
  const browser = connectedBrowser(
    () =>
      new Promise((_, reject) => {
        rejectEvaluation = reject;
      }),
  );
  const pending = browser.call('inspect_world', {});

  await browser.close();
  const cause = new Error('Target closed');

  rejectEvaluation(cause);
  await assert.rejects(pending, { cause, message: /disconnected or page closed/ });
});

test('fixed page dispatch preserves queued movement and preferred abort API', () => {
  const args = { x: 1, y: 2, z: 3, queue: true };
  const calls = [];

  globalThis.window = {
    world: {
      interact: {
        moveTo: (point, options) => {
          calls.push([point, options]);

          return { accepted: true, id: 7 };
        },
        abortNavigation: () => calls.push('abort'),
        stop: () => assert.fail('legacy stop should not run when abortNavigation exists'),
      },
    },
  };
  try {
    assert.deepEqual(worldOperation({ name: 'move_to', args }), { accepted: true, id: 7 });
    assert.deepEqual(worldOperation({ name: 'stop_movement', args: {} }), { stopped: true });
    assert.deepEqual(calls, [[args, { queue: true }], 'abort']);
    assert.throws(() => worldOperation({ name: 'toString', args: {} }), /Unknown world tool/);
  } finally {
    delete globalThis.window;
  }
});

test('export aggregation preserves missing data, numeric usage and nested costs', () => {
  const entries = [
    {},
    { message: { role: 'user', content: 'hello' } },
    {
      message: {
        role: 'assistant',
        provider: 'p',
        model: 'm',
        usage: { input: 3, cost: { total: 0.2, label: 'ignored' }, metadata: {} },
      },
    },
    {
      message: {
        role: 'assistant',
        provider: 'p',
        model: 'm',
        content: [
          { type: 'text', text: 'hi' },
          { type: 'toolCall', name: 'move_to' },
        ],
        usage: { input: 4, cost: { total: 0.3 } },
      },
    },
    { message: { role: 'assistant', provider: 'q', model: 'n', usage: { cost: null } } },
    { message: { role: 'toolResult', isError: false } },
  ];
  const result = metrics(entries, { segments: [{ outcome: 'arrived', samples: [] }] });

  assert.deepEqual(result.usage, { input: 7, cost: { total: 0.5 } });
  assert.deepEqual(result.models, ['p/m', 'q/n']);
  assert.equal(result.assistantMessages, 3);
  assert.equal(result.toolCalls.move_to, 1);
  assert.equal(result.toolErrors, 0);
  assert.deepEqual(result.navigation, { segments: 1, samples: 0, distance: 0, outcomes: { arrived: 1 } });
});

test('export artifacts retain prompt text and stale trajectory after disconnection', async () => {
  const exporter = new ExperimentExport();
  const data = { seed: 213, trajectory: { segments: [] } };
  const browser = connectedBrowser(async () => data);
  const entries = [
    {
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Explore' }, { type: 'image' }, { type: 'text', text: 'carefully' }],
      },
    },
  ];
  const ctx = {
    sessionManager: {
      getEntries: () => entries,
      getHeader: () => ({ type: 'session' }),
      getSessionId: () => 'test-session',
      getLeafId: () => 'test-leaf',
    },
  };

  try {
    await exporter.save(ctx, browser, 'completed');
    assert.equal(await readFile(join(exporter.directory, 'prompt.txt'), 'utf8'), 'Explore\ncarefully');
    const fresh = JSON.parse(await readFile(join(exporter.directory, 'manifest.json'), 'utf8'));

    assert.equal(fresh.complete, true);
    assert.equal(fresh.availability.trajectoryStale, false);
    await browser.close();
    await exporter.save(ctx, browser, 'interrupted');
    const stale = JSON.parse(await readFile(join(exporter.directory, 'manifest.json'), 'utf8'));

    assert.equal(stale.complete, false);
    assert.equal(stale.availability.trajectoryStale, true);
    assert.deepEqual(JSON.parse(await readFile(join(exporter.directory, 'trajectory.json'), 'utf8')), data.trajectory);
  } finally {
    await rm(exporter.directory, { recursive: true, force: true });
  }
});
