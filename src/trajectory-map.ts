import { SIZE, type World, type Vector } from './world';
import type { TrajectoryHistory, Segment } from './trajectory';
import { drawPerceptionSector } from './perception-view';
import { trajectoryColors } from './trajectory-colors';
const size = 220;
const padding = 10;
const scale = (size - 2 * padding) / SIZE;
const point = (p: Vector) => [size / 2 + p.x * scale, size / 2 + p.z * scale] as const;

function drawSegment(ctx: CanvasRenderingContext2D, segment: Segment, destinationsVisible: boolean) {
  ctx.strokeStyle = trajectoryColors[segment.outcome];
  ctx.lineWidth = 2;
  ctx.beginPath();
  segment.samples.forEach((sample, i) => {
    const [x, y] = point(sample.position);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  if (destinationsVisible && segment.destination) {
    const [x, y] = point(segment.destination);

    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawObject(ctx: CanvasRenderingContext2D, object: ReturnType<World['inspect']>['objects'][number]) {
  const [x, y] = point(object.position);

  ctx.fillStyle = { beacon: '#e4ad58', rock: '#bbc8ce', tower: '#e0eacb' }[object.type];

  if (object.type === 'rock') {
    ctx.fillRect(x - 3, y - 3, 6, 6);

    return;
  }

  ctx.beginPath();

  if (object.type === 'beacon') {
    ctx.arc(x, y, 3, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
  }

  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: ReturnType<World['inspect']>['player']) {
  const [x, y] = point(player.position);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-player.orientation.y);
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#18262b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawMapBackground(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#20383e';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#526b70';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);
  ctx.beginPath();
  ctx.moveTo(size / 2, padding);
  ctx.lineTo(size / 2, size - padding);
  ctx.moveTo(padding, size / 2);
  ctx.lineTo(size - padding, size / 2);
  ctx.stroke();
}

export function createTrajectoryMap(canvas: HTMLCanvasElement, inspect?: World['inspect']) {
  const ctx = canvas.getContext('2d')!;

  return (
    history: TrajectoryHistory,
    state: {
      visible: boolean;
      destinationsVisible: boolean;
      perceptionVisible?: boolean;
    },
  ) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== size * ratio || canvas.height !== size * ratio) {
      canvas.width = size * ratio;
      canvas.height = size * ratio;
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawMapBackground(ctx);

    if (state.visible) {
      history.segments.forEach((segment) => drawSegment(ctx, segment, state.destinationsVisible));
    }
    if (!inspect) {
      return;
    }
    const world = inspect();

    if (state.perceptionVisible) {
      drawPerceptionSector(ctx, world.player, { origin: point(world.player.position), scale });
    }

    world.objects.forEach((object) => drawObject(ctx, object));
    drawPlayer(ctx, world.player);
  };
}
