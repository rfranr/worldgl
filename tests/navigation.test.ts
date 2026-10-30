import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/world';

const keys = new Set<string>();
const tick = (world: ReturnType<typeof createWorld>, seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) world.update(0.05, keys);
};
const setup = () => {
  const world = createWorld();
  world.interact.setPlayerPosition({ x: 0, y: 50, z: 0 });
  return world;
};

test('slow, cumulative progress continues beyond 30 simulation seconds and arrives', () => {
  const world = setup();
  world.interact.moveTo({ x: 100, y: 50, z: 0 });
  // Simulate a constrained flight: retain only 0.01 units per frame.
  // Each step is smaller than the meaningful-progress threshold.
  for (let i = 0; i < 800; i++) {
    world.player.position.x = i * 0.01;
    world.update(0.05, keys);
    assert.equal(world.interact.getNavigationStatus().state, 'moving');
  }
  tick(world, 10);
  assert.equal(world.interact.getNavigationStatus().state, 'arrived');
});

test('stalled navigation and small oscillations eventually block', () => {
  const world = setup();
  world.interact.moveTo({ x: 100, y: 50, z: 0 });
  for (let i = 0; i < 140; i++) {
    world.player.position.x = i % 2 ? 0.01 : 0;
    world.update(0.05, keys);
  }
  assert.equal(world.interact.getNavigationStatus().state, 'blocked');
});

test('below-clearance destinations block even inside arrival tolerance', () => {
  const world = setup();
  const y = world.terrainHeight(0, 0) + 1.5;
  world.interact.setPlayerPosition({ x: 0, y, z: 0 });
  world.interact.moveTo({ x: 0, y: y - 0.01, z: 0 });
  tick(world, 0.05);
  assert.equal(world.interact.getNavigationStatus().state, 'blocked');
});

test('replacement command resets inactivity and replaces the target', () => {
  const world = setup();
  world.interact.moveTo({ x: 100, y: 50, z: 0 });
  for (let i = 0; i < 90; i++) {
    world.player.position.x = 0;
    world.update(0.05, keys);
  }
  const target = { x: -20, y: 50, z: 10 };
  world.interact.moveTo(target);
  assert.deepEqual(world.interact.getNavigationStatus().target, target);
  tick(world, 3);
  assert.equal(world.interact.getNavigationStatus().state, 'arrived');
});

test('stop, manual controls, keyboard and teleportation cancel navigation', () => {
  for (const cancel of [
    (w: ReturnType<typeof createWorld>) => w.interact.stop(),
    (w: ReturnType<typeof createWorld>) => w.interact.setControls({ forward: 1 }),
    (w: ReturnType<typeof createWorld>) => w.update(0.05, new Set(['KeyW'])),
    (w: ReturnType<typeof createWorld>) => w.interact.setPlayerPosition({ x: 5, y: 50, z: 0 }),
  ]) {
    const world = setup();
    world.interact.moveTo({ x: 100, y: 50, z: 0 });
    cancel(world);
    assert.equal(world.interact.getNavigationStatus().state, 'idle');
    tick(world, 6);
    assert.equal(world.interact.getNavigationStatus().state, 'idle');
  }
});
