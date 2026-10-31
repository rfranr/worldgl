import { SIZE, type World, type Vector } from './world';
import type { createTrajectory, TrajectoryHistory, Segment } from './trajectory';
import { trajectoryColors } from './trajectory-colors';

type API = ReturnType<typeof createTrajectory>['api'];

// Human-only controls: no interaction methods, navigation, or recorder duplication.
export function createTrajectoryUI(api: API, inspect: World['inspect']) {
  const root = document.createElement('section');
  root.id = 'trajectory-debug';
  root.setAttribute('aria-label', 'Trajectory debugging');
  root.innerHTML = `
    <div class="debug-toggles">
      <label><input type="checkbox" data-panel checked> Debug panel</label>
      <label><input type="checkbox" data-map checked> Minimap</label>
    </div>
    <details class="debug-panel" open>
      <summary>Trajectory recorder</summary>
      <div class="debug-buttons">
        <button type="button" data-record>Start recording</button>
        <button type="button" data-clear>Clear</button>
        <button type="button" data-download>Download JSON</button>
      </div>
      <label><input type="checkbox" data-visible checked> Show trajectories</label>
      <label><input type="checkbox" data-destinations checked> Show destinations</label>
      <output data-stats aria-live="polite"></output>
      <small>Blue: active · Green: completed<br>Amber: interrupted · Red: blocked</small>
    </details>
    <figure class="debug-map">
      <canvas aria-label="North-up world minimap: player arrow, landmarks and trajectories" role="img"></canvas>
      <figcaption>N ↑ · X → · −Z ↑<br>▲ Player · ● Beacon · ■ Rock · ◆ Tower</figcaption>
    </figure>`;
  document.body.append(root);
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const panel = get<HTMLDetailsElement>('.debug-panel');
  const map = get<HTMLElement>('.debug-map');
  const record = get<HTMLButtonElement>('[data-record]');
  const visible = get<HTMLInputElement>('[data-visible]');
  const destinations = get<HTMLInputElement>('[data-destinations]');
  const stats = get<HTMLOutputElement>('[data-stats]');
  get<HTMLInputElement>('[data-panel]').onchange = event => { panel.hidden = !(event.target as HTMLInputElement).checked; };
  get<HTMLInputElement>('[data-map]').onchange = event => { map.hidden = !(event.target as HTMLInputElement).checked; };
  record.onclick = () => { if (api.getState().recording) api.stop(); else api.start(); refresh(); };
  get('[data-clear]').onclick = () => { api.clear(); refresh(); };
  visible.onchange = () => { api.setVisible(visible.checked); refresh(); };
  destinations.onchange = () => { api.setDestinationsVisible(destinations.checked); refresh(); };
  get('[data-download]').onclick = () => {
    const url = URL.createObjectURL(new Blob([api.exportJSON()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'trajectory.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const canvas = get<HTMLCanvasElement>('canvas');
  const ctx = canvas.getContext('2d')!;
  const size = 220, padding = 10, scale = (size - 2 * padding) / SIZE;
  const point = (p: Vector) => [size / 2 + p.x * scale, size / 2 + p.z * scale] as const;
  function draw(history: TrajectoryHistory) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * ratio || canvas.height !== size * ratio) {
      canvas.width = size * ratio; canvas.height = size * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#20383e'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#526b70'; ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);
    ctx.beginPath(); ctx.moveTo(size / 2, padding); ctx.lineTo(size / 2, size - padding);
    ctx.moveTo(padding, size / 2); ctx.lineTo(size - padding, size / 2); ctx.stroke();
    const state = api.getState();
    if (state.visible) history.segments.forEach(segment => drawSegment(segment, state.destinationsVisible));
    const world = inspect();
    world.objects.forEach(drawObject);
    drawPlayer(world.player);
  }
  function drawSegment(segment: Segment, destinationsVisible: boolean) {
      ctx.strokeStyle = trajectoryColors[segment.outcome]; ctx.lineWidth = 2;
      ctx.beginPath();
      segment.samples.forEach((sample, i) => {
        const [x, y] = point(sample.position);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (destinationsVisible && segment.destination) {
        const [x, y] = point(segment.destination);
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.stroke();
      }
  }
  function drawObject(object: ReturnType<World['inspect']>['objects'][number]) {
      const [x, y] = point(object.position);
      ctx.fillStyle = { beacon: '#e4ad58', rock: '#bbc8ce', tower: '#e0eacb' }[object.type];
      if (object.type === 'rock') ctx.fillRect(x - 3, y - 3, 6, 6);
      else {
        ctx.beginPath();
        if (object.type === 'beacon') ctx.arc(x, y, 3, 0, Math.PI * 2);
        else { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y); ctx.closePath(); }
        ctx.fill();
      }
  }
  function drawPlayer(player: ReturnType<World['inspect']>['player']) {
    const [x, y] = point(player.position);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-player.orientation.y);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#18262b'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  function refresh() {
    const state = api.getState();
    record.textContent = state.recording ? 'Stop recording' : 'Start recording';
    visible.checked = state.visible; destinations.checked = state.destinationsVisible;
    const history = api.getHistory();
    const text = `${state.recording ? 'Recording' : 'Stopped'} · ${history.segments.length} segments · ${history.segments.reduce((n, s) => n + s.samples.length, 0)} samples`;
    if (stats.textContent !== text) stats.textContent = text;
    if (!map.hidden) draw(history);
  }
  let next = 0;
  refresh();
  return (now: number) => {
    if (now >= next) { refresh(); next = now + 100; }
  };
}
