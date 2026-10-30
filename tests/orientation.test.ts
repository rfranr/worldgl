import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/world';

const tick = (w: ReturnType<typeof createWorld>, count = 100) => {
  for (let i = 0; i < count; i++) w.update(0.02, new Set());
};
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('relative turn and look-at are progressive, finite-rate and position preserving', () => {
  const w = createWorld(), p = { ...w.player.position };
  w.interact.turnBy({ radians: Math.PI / 2 });
  near(w.player.orientation.y, 0);
  tick(w, 1); near(w.player.orientation.y, 0.036);
  tick(w); near(w.player.orientation.y, Math.PI / 2);
  assert.deepEqual(w.player.position, p);
  w.interact.lookAt({ x: p.x + 20, y: p.y + 10, z: p.z });
  tick(w); near(w.player.orientation.y, -Math.PI / 2);
  w.interact.lookAt(w.player.position); tick(w); near(w.player.orientation.y, -Math.PI / 2);
});

test('rotation replacement, stop, keyboard and API controls interrupt rotation', () => {
  const w = createWorld();
  w.interact.turnBy({ radians: 2 }); tick(w, 5);
  w.interact.turnBy({ radians: -0.5 }); tick(w); near(w.player.orientation.y, -0.32);
  for (const cancel of [() => w.interact.stop(), () => w.interact.setControls({ turn: 0 }),
    () => w.update(0, new Set(['KeyW']))]) {
    w.interact.turnBy({ radians: 2 }); tick(w, 1); cancel();
    const yaw = w.player.orientation.y; tick(w); near(w.player.orientation.y, yaw);
  }
});

test('navigation turns smoothly, arrives, and replaces rotation in both directions', () => {
  const w = createWorld();
  w.interact.setPlayerPosition({ x: 0, y: 40, z: 0 });
  w.interact.turnBy({ radians: 2 });
  w.interact.moveTo({ x: 30, y: 40, z: 0 });
  near(w.player.orientation.y, 0);
  tick(w, 1); near(w.player.orientation.y, -0.036);
  tick(w, 200);
  assert.equal(w.interact.getNavigationStatus().state, 'arrived');
  near(w.player.orientation.y, -Math.PI / 2);
  w.interact.moveTo({ x: -30, y: 40, z: 0 });
  w.interact.lookAt({ x: 30, y: 0, z: -20 });
  assert.equal(w.interact.getNavigationStatus().state, 'idle');
  const p = { ...w.player.position }; tick(w); assert.deepEqual(w.player.position, p);
});
