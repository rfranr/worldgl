import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { WorldBrowser } from './core.mjs';
const browser = new WorldBrowser(chromium, process.env.WORLDGL_URL);
try {
  await browser.start();
  const call = async (name, args = {}) => (await browser.call(name, args)).details;
  const initial = await call('inspect_world');
  assert.ok(initial.player && initial.objects);
  await call('move_by', { forward: 8 });
  assert.equal((await call('navigation_status')).state, 'moving');
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.notDeepEqual((await call('inspect_world')).player.position, initial.player.position);
  const target = { ...initial.player.position, x: initial.player.position.x + 12 };
  await call('move_to', target);
  assert.deepEqual((await call('navigation_status')).target, target);
  await call('stop_movement');
  assert.equal((await call('navigation_status')).state, 'idle');
  console.log('Browser smoke passed (no model calls).');
} finally { await browser.close(); }
