import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/world';

test('clearance blockage is factual, detached and retained in route history', () => {
  const world = createWorld();
  const minimumTargetY = world.terrainHeight(0, 0) + 1.5;
  const target = { x: 0, y: minimumTargetY - 1, z: 0 };
  world.interact.executeRoute([target, { x: 10, y: 50, z: 0 }]);
  world.update(0.05, new Set());
  const status = world.interact.getNavigationStatus();
  const blockage = status.blockage!;
  assert.equal(status.state, 'blocked');
  assert.equal(blockage.reason, 'destination_below_clearance');
  if (blockage.reason !== 'destination_below_clearance') assert.fail('wrong cause');
  assert.equal(blockage.constraints.minimumTargetY, minimumTargetY);
  assert.deepEqual(blockage.target, target);
  assert.deepEqual(status.route!.outcomes[0].blockage, blockage);
  assert.equal(status.route!.outcomes[1].blockage, undefined);
  assert.equal('retryable' in blockage, false);
  assert.equal('suggestedAction' in blockage, false);
  blockage.position.x = 999;
  assert.notEqual(world.interact.getNavigationStatus().blockage!.position.x, 999);
  world.interact.moveTo({ x: 10, y: 50, z: 0 });
  assert.equal(world.interact.getNavigationStatus().blockage, undefined);
  assert.deepEqual(world.interact.getNavigationStatus().outcomes[0].blockage!.target, target);
  world.interact.stop();
  assert.equal(world.interact.getNavigationStatus().blockage, undefined);
});

test('stalled movement reports measured progress without prescribing recovery', () => {
  const world = createWorld();
  world.interact.setPlayerPosition({ x: 0, y: 50, z: 0 });
  world.interact.moveTo({ x: 100, y: 50, z: 0 });
  for (let index = 0; index < 110; index++) {
    world.player.position.x = 0;
    world.update(0.05, new Set());
  }
  const status = world.interact.getNavigationStatus();
  const blockage = status.blockage!;
  assert.equal(blockage.reason, 'no_progress');
  if (blockage.reason !== 'no_progress') assert.fail('wrong cause');
  assert.ok(blockage.progress.secondsWithoutProgress >= 5);
  assert.equal(blockage.progress.distanceRemaining, 100);
  assert.equal(blockage.position.x, 0);
  assert.deepEqual(status.outcomes[0].blockage, blockage);
});
