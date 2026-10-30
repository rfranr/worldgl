import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, createWorld, INITIAL_OBJECTS, SIZE } from '../src/world';

test('terrain is deterministic, seed-dependent, and matches triangle interpolation', () => {
  const a = createTerrain(213), b = createTerrain(213), c = createTerrain(214);
  for (const [x, z] of [[0, 0], [-117.5, 83.2], [24, -40], [119, 119]]) {
    assert.equal(a.height(x, z), b.height(x, z));
    assert.notEqual(a.height(x, z), c.height(x, z));
    assert.ok(Number.isFinite(a.height(x, z)));
  }
  assert.equal(a.height(0, 0), a.vertexHeight(0, 0));
  assert.ok(Math.abs(a.height(1, 1) - (a.vertexHeight(0, 0) * 0.5 + a.vertexHeight(4, 0) * 0.25 + a.vertexHeight(0, 4) * 0.25)) < 1e-10);
});

test('inspection exposes isolated player, objects, and terrain without rendering', () => {
  const world = createWorld();
  const state = world.inspect();
  assert.equal(state.objects.length, 3);
  assert.equal(new Set(state.objects.map(o => o.id)).size, 3);
  assert.deepEqual(state.objects, INITIAL_OBJECTS);
  assert.deepEqual(state.player.orientation, { x: 0, y: 0, z: 0 });
  state.player.position.y = -999;
  state.objects[0].position.x = -999;
  assert.notEqual(world.inspect().player.position.y, -999);
  assert.notEqual(world.inspect().objects[0].position.x, -999);
  assert.equal(world.terrainHeight(1, 2), createTerrain(213).height(1, 2));
});

test('flight moves, turns, stays above terrain and inside boundaries; reset works', () => {
  const world = createWorld(), initial = world.inspect().player;
  for (let i = 0; i < 500; i++) world.update(0.05, new Set(['KeyW', 'ShiftLeft']));
  assert.notEqual(world.player.position.z, initial.position.z);
  assert.ok(Math.abs(world.player.position.z) < SIZE / 2);
  const p = world.player.position;
  assert.ok(p.y >= world.terrainHeight(p.x, p.z) + 1.5);
  world.update(0.05, new Set(['KeyA', 'Space']));
  assert.ok(world.player.orientation.y > 0);
  world.reset();
  assert.deepEqual(world.inspect().player, initial);
});
