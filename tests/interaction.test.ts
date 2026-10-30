import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/world';
const tick = (w: ReturnType<typeof createWorld>, count = 800) => { for (let i = 0; i < count; i++) w.update(.05, new Set()); };

test('navigation progresses, replaces targets, arrives and blocks unreachable ground', () => {
  const w = createWorld(), start = w.inspect().player.position;
  w.interact.moveBy({ forward: 10 });
  assert.deepEqual(w.player.position, start);
  w.update(.05, new Set());
  assert.ok(w.player.position.z < start.z);
  w.interact.moveTo({ x: 20, y: 30, z: -20 });
  w.interact.moveTo({ x: -10, y: 30, z: 30 });
  tick(w);
  assert.equal(w.interact.getNavigationStatus().state, 'arrived');
  assert.ok(Math.hypot(w.player.position.x + 10, w.player.position.y - 30, w.player.position.z - 30) <= .15);
  w.interact.moveTo({ x: 0, y: -60, z: 0 });
  tick(w);
  assert.equal(w.interact.getNavigationStatus().state, 'blocked');
});

test('partial controls, timeout, interruption and keyboard handover', () => {
  let time = 0;
  const w = createWorld(undefined, undefined, () => time), api = w.interact;
  api.setControlTimeout(2000);
  api.setControls({ forward: 1, turn: .5 }); api.setControls({ turn: -.5 });
  assert.equal(api.getControls().forward, 1);
  time = 2001;
  assert.equal(api.getControls().forward, 0);
  api.moveBy({ forward: 10 });
  time += 10000; w.update(.05, new Set());
  assert.equal(api.getNavigationStatus().state, 'moving');
  api.setControls({ forward: 1 });
  assert.equal(api.getNavigationStatus().state, 'idle');
  api.moveBy({ forward: 10 });
  assert.equal(api.getControls().forward, 0);
  w.update(.05, new Set(['KeyW']));
  assert.equal(api.getNavigationStatus().state, 'idle');
  api.moveBy({ forward: 10 }); api.stop();
  const p = w.inspect().player.position; tick(w, 10); assert.deepEqual(w.player.position, p);
  api.moveBy({ forward: 10 }); api.setPlayerOrientation({ x: 0, y: 1, z: 0 });
  assert.equal(api.getNavigationStatus().state, 'idle');
});

test('validation, isolated state, mutations and reset', () => {
  const w = createWorld(), a = w.interact, initial = w.inspect();
  for (const n of [NaN, Infinity, -Infinity]) {
    assert.throws(() => a.setControls({ turn: n }));
    assert.throws(() => a.moveTo({ x: n, y: 20, z: 0 }));
    assert.throws(() => a.setControlTimeout(n));
  }
  assert.throws(() => a.setControls({ forward: 2 }));
  assert.throws(() => a.setControlTimeout(-1));
  assert.throws(() => a.moveTo({ x: 200, y: 20, z: 0 }));
  const object = { id: 'test', type: 'rock' as const, position: { x: 1, y: 5, z: 1 }, orientation: { x: 0, y: 0, z: 0 } };
  a.addObject(object); object.position.x = 99;
  assert.equal(w.inspect().objects.at(-1)!.position.x, 1);
  assert.throws(() => a.addObject(object));
  assert.throws(() => a.addObject({ ...object, id: 'bad', type: 'bad' as any }));
  a.moveObject('test', { x: 2, y: 5, z: 2 });
  assert.equal(w.inspect().objects.at(-1)!.position.x, 2);
  a.removeObject('test'); assert.throws(() => a.removeObject('test'));
  a.moveBy({ forward: 10 });
  const status = a.getNavigationStatus(); status.target!.x = 100;
  assert.notEqual(a.getNavigationStatus().target!.x, 100);
  a.removeObject(initial.objects[0].id); a.reset();
  assert.deepEqual(w.inspect(), initial);
  assert.equal(a.getNavigationStatus().state, 'idle');
});
