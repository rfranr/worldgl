import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, type WorldObject } from '../src/world';

const object = (id: string, x: number, z: number, y = 50): WorldObject => ({
  id, type: 'beacon', position: { x, y, z }, orientation: { x: 0, y: 0, z: 0 },
});
function setup() {
  const world = createWorld(213, [object('ahead', 0, -20), object('behind', 0, 20),
    object('side', 20, 0), object('far', 0, -70), object('boundary', 0, -60), object('high', 0, -10, 120)]);
  world.interact.setPlayerPosition({ x: 0, y: 50, z: 0 });
  return world;
}
const ids = (world: ReturnType<typeof createWorld>) => world.observe().objects.map(o => o.id);
function tick(world: ReturnType<typeof createWorld>, seconds: number) {
  for (let i = 0; i < seconds / 0.05; i++) world.update(0.05, new Set());
}

test('perception filters bearing and 3D range, including the distance boundary', () => {
  assert.deepEqual(ids(setup()), ['ahead', 'boundary']);
});

test('turning and looking change current visibility without retaining past sightings', () => {
  const world = setup();
  world.interact.turnBy({ radians: Math.PI });
  tick(world, 3);
  assert.deepEqual(ids(world), ['behind']);
  world.interact.lookAt({ x: 20, y: 50, z: 0 });
  tick(world, 3);
  assert.deepEqual(ids(world), ['side']);
});

test('movement discovers objects outside the previous range', () => {
  const world = setup();
  world.interact.moveBy({ forward: 20 });
  tick(world, 2);
  assert.ok(ids(world).includes('far'));
});

test('observation is detached and does not change the simulation or navigation', () => {
  const world = setup();
  world.interact.moveTo({ x: 0, y: 50, z: -10 });
  const before = world.inspect();
  const status = world.interact.getNavigationStatus();
  const observation = world.observe();
  observation.player.position.x = 100;
  observation.objects[0]!.position.x = 100;
  observation.objects.length = 0;
  assert.deepEqual(world.inspect(), before);
  assert.deepEqual(world.interact.getNavigationStatus(), status);
  assert.equal(world.objects.length, 6);
  tick(world, 3);
  assert.equal(world.interact.getNavigationStatus().state, 'arrived');
});
