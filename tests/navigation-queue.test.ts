import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigation } from '../src/navigation';

function setup(height = () => 0) {
  const player = { position: { x: 0, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0 } };
  return { player, nav: createNavigation(player, height) };
}
const target = (x: number) => ({ x, y: 2, z: 0 });

test('queued movement acknowledges immediately and completes in order', () => {
  const { nav, player } = setup();
  const a = nav.moveTo(target(1));
  const b = nav.moveTo(target(2), { queue: true });
  assert.equal(player.position.x, 0);
  assert.deepEqual(nav.getStatus().pending.map(c => c.id), [b.id]);
  for (let i = 0; i < 30; i++) nav.update(0.1);
  assert.deepEqual(nav.getStatus().outcomes.map(c => [c.id, c.outcome]), [[a.id, 'arrived'], [b.id, 'arrived']]);
  assert.equal(nav.getStatus().state, 'arrived');
});

test('abort cancels active and pending commands without further motion', () => {
  const { nav, player } = setup();
  nav.moveTo(target(10)); nav.moveTo(target(20), { queue: true });
  nav.update(0.1); nav.abort();
  const x = player.position.x;
  nav.update(1);
  assert.equal(player.position.x, x);
  assert.equal(nav.getStatus().state, 'idle');
  assert.deepEqual(nav.getStatus().outcomes.map(c => c.outcome), ['cancelled', 'cancelled']);
});

for (const failure of ['blocked', 'failed'] as const) {
  test(`${failure} stops the queue`, () => {
    const { nav } = setup(() => { if (failure === 'failed') throw new Error('terrain unavailable'); return 5; });
    nav.moveTo(target(1)); nav.moveTo(target(2), { queue: true });
    nav.update(0.1);
    assert.equal(nav.getStatus().state, failure);
    assert.equal(nav.getStatus().pending.length, 0);
    assert.deepEqual(nav.getStatus().outcomes.map(c => c.outcome), [failure, 'cancelled']);
  });
}

test('invalid requests and queue overflow do not interrupt; default movement replaces', () => {
  const { nav } = setup();
  nav.moveTo(target(1));
  assert.throws(() => nav.moveTo(target(NaN)));
  assert.throws(() => nav.moveTo(target(119), { queue: true }));
  for (let i = 0; i < 64; i++) nav.moveTo(target(2), { queue: true });
  assert.throws(() => nav.moveTo(target(3), { queue: true }));
  assert.equal(nav.getStatus().active?.target.x, 1);
  nav.moveTo(target(4));
  assert.equal(nav.getStatus().pending.length, 0);
  assert.equal(nav.getStatus().target?.x, 4);
  assert.ok(nav.getStatus().outcomes.every(c => c.outcome === 'interrupted'));
});
