import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWorld } from '../src/world';
import { createPerceptionView, perceptionBounds } from '../src/perception-view';
import { MAX_OBSERVATION_DISTANCE } from '../src/perception';

test('overlay toggles, follows position/yaw and rebuilds elevation boundaries', () => {
  const scene = new THREE.Scene();
  const sync = createPerceptionView(scene);
  const { player } = createWorld();
  const lines = scene.children[0] as THREE.LineSegments;
  assert.equal(lines.visible, false);
  sync(player, true);
  assert.equal(lines.visible, true);
  const initial = lines.geometry.getAttribute('position');
  player.orientation.x = 0.4;
  player.orientation.y = 1;
  player.position.x += 5;
  sync(player, true);
  assert.notEqual(lines.geometry.getAttribute('position'), initial);
  assert.equal(lines.rotation.y, 1);
  assert.equal(lines.position.x, player.position.x);
  const positions = lines.geometry.getAttribute('position');
  const bounds = perceptionBounds(player.orientation.x);
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    if (point.length() === 0) continue;
    assert.ok(Math.abs(point.length() - MAX_OBSERVATION_DISTANCE) < 1e-5);
    const elevation = Math.atan2(point.y, Math.hypot(point.x, point.z));
    assert.ok(elevation >= bounds.lower - 1e-7 && elevation <= bounds.upper + 1e-7);
    assert.ok(Math.abs(Math.atan2(-point.x, -point.z)) <= bounds.halfWidth + 1e-7);
  }
  sync(player, false);
  assert.equal(lines.visible, false);
});
