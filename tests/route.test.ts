import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigation } from '../src/navigation';
const point = (x: number) => ({ x, y: 2, z: 0 });
function setup(height = () => 0) {
  return createNavigation({ position: point(0), orientation: point(0) }, height);
}
test('route acceptance is immediate; waypoints complete sequentially', () => {
  const nav = setup();
  const ack = nav.executeRoute([point(1), point(2), point(3)]);
  assert.equal(ack.accepted, true);
  assert.equal(nav.getStatus().route?.id, ack.id);
  assert.equal(nav.getStatus().route?.completed, 0);
  for (let i = 0; i < 50; i++) nav.update(0.1);
  assert.equal(nav.getStatus().route?.state, 'arrived');
  assert.equal(nav.getStatus().route?.completed, 3);
  assert.deepEqual(nav.getStatus().route?.outcomes.map(c => c.id), ack.commandIds);
});
for (const terminal of ['blocked', 'failed', 'cancelled'] as const) {
  test(`partial route retains results after ${terminal}`, () => {
    let failing = false;
    const nav = setup(() => {
      if (!failing) return 0;
      if (terminal === 'failed') throw new Error('terrain failure');
      return 5;
    });
    nav.executeRoute([point(0), point(10), point(20)]);
    nav.update(0.1);
    failing = true;
    if (terminal === 'cancelled') nav.abort(); else nav.update(0.1);
    const route = nav.getStatus().route!;
    assert.equal(route.completed, 1);
    assert.equal(route.state, terminal);
    assert.deepEqual(route.outcomes.map(c => c.outcome), ['arrived', terminal, 'cancelled']);
    nav.update(1);
    assert.deepEqual(nav.getStatus().route, route);
  });
}
test('invalid routes leave existing navigation untouched', () => {
  const nav = setup();
  nav.executeRoute([point(1), point(2)]);
  const before = nav.getStatus();
  for (const route of [[], [point(1), point(NaN)], [point(119)], Array.from({ length: 66 }, () => point(0))]) {
    assert.throws(() => nav.executeRoute(route));
    assert.deepEqual(nav.getStatus(), before);
  }
});
