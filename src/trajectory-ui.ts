import type { World } from './world';
import type { createTrajectory } from './trajectory';
import { createTrajectoryMap } from './trajectory-map';

type API = ReturnType<typeof createTrajectory>['api'];

// Human-only controls: no interaction methods, navigation, or recorder duplication.
function createPanel() {
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
  return root;
}
export function createTrajectoryUI(api: API, inspect: World['inspect']) {
  const root = createPanel();
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
  const draw = createTrajectoryMap(canvas, inspect);
  function refresh() {
    const state = api.getState();
    record.textContent = state.recording ? 'Stop recording' : 'Start recording';
    visible.checked = state.visible; destinations.checked = state.destinationsVisible;
    const history = api.getHistory();
    const text = `${state.recording ? 'Recording' : 'Stopped'} · ${history.segments.length} segments · ${history.segments.reduce((n, s) => n + s.samples.length, 0)} samples`;
    if (stats.textContent !== text) stats.textContent = text;
    if (!map.hidden) draw(history, api.getState());
  }
  let next = 0;
  refresh();
  return (now: number) => {
    if (now >= next) { refresh(); next = now + 100; }
  };
}
