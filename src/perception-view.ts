import * as THREE from 'three';
import type { Player } from './flight';
import { HORIZONTAL_FIELD_OF_VIEW, VERTICAL_FIELD_OF_VIEW, MAX_OBSERVATION_DISTANCE } from './perception';
// Perception uses world elevation and azimuth independently, not a rotated camera frustum.
export function perceptionBounds(pitch: number) {
  return {
    lower: Math.max(-Math.PI / 2, pitch - VERTICAL_FIELD_OF_VIEW / 2),
    upper: Math.min(Math.PI / 2, pitch + VERTICAL_FIELD_OF_VIEW / 2),
    halfWidth: HORIZONTAL_FIELD_OF_VIEW / 2,
    range: MAX_OBSERVATION_DISTANCE,
  };
}

export function createPerceptionView(scene: THREE.Scene) {
  const geometry = new THREE.BufferGeometry();
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#71edff',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );

  lines.visible = false;
  scene.add(lines);
  let previousPitch = NaN;

  function rebuild(pitch: number) {
    const { lower, upper, halfWidth, range } = perceptionBounds(pitch);
    const vertices: number[] = [];
    const point = (azimuth: number, elevation: number) => [
      -range * Math.cos(elevation) * Math.sin(azimuth),
      range * Math.sin(elevation),
      -range * Math.cos(elevation) * Math.cos(azimuth),
    ];
    const steps = 32;

    for (let i = 0; i < steps; i++) {
      const a = -halfWidth + (2 * halfWidth * i) / steps;
      const b = -halfWidth + (2 * halfWidth * (i + 1)) / steps;
      const c = lower + ((upper - lower) * i) / steps;
      const d = lower + ((upper - lower) * (i + 1)) / steps;

      for (const elevation of [lower, upper]) {
        vertices.push(...point(a, elevation), ...point(b, elevation));
      }

      for (const azimuth of [-halfWidth, halfWidth]) {
        vertices.push(...point(azimuth, c), ...point(azimuth, d));
      }
    }
    [lower, upper].forEach((elevation) => {
      [-halfWidth, halfWidth].forEach((azimuth) => vertices.push(0, 0, 0, ...point(azimuth, elevation)));
    });
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeBoundingSphere();
  }

  return (player: Player, visible: boolean) => {
    lines.visible = visible;

    if (!visible) {
      return;
    }
    if (previousPitch !== player.orientation.x) {
      rebuild(player.orientation.x);
      previousPitch = player.orientation.x;
    }

    lines.position.copy(player.position);
    lines.rotation.y = player.orientation.y;
  };
}

export function drawPerceptionSector(
  ctx: CanvasRenderingContext2D,
  player: Player,
  projection: {
    origin: readonly [number, number];
    scale: number;
  },
) {
  const {
    origin: [x, y],
    scale,
  } = projection;
  const { lower, upper, halfWidth, range } = perceptionBounds(player.orientation.x);
  // The horizontal projection shrinks when the entire elevation interval looks up/down.
  const elevation = Math.max(lower, Math.min(upper, 0));
  const radius = range * Math.cos(elevation) * scale;
  const heading = -Math.PI / 2 - player.orientation.y;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, heading - halfWidth, heading + halfWidth);
  ctx.closePath();
  ctx.fillStyle = 'rgba(113, 237, 255, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(113, 237, 255, 0.65)';
  ctx.lineWidth = 1;
  ctx.stroke();
}
