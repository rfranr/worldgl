import { groups, loadRun, measurements, sessionEvents } from './comparison-data';
import type { Run } from './comparison-data';
import { sessionSummary } from './inspector-data';

function color(index: number) { return `hsl(${(index * 137.508) % 360} 65% 38%)`; }
function element(parent: Element, tag: string, value = '') {
  const node = document.createElement(tag); node.textContent = value; parent.append(node); return node;
}
function button(parent: Element, label: string, action: () => void) {
  const node = element(parent, 'button', label); node.addEventListener('click', action); return node;
}
function map(parent: HTMLElement, runs: Run[], inspect: (value: unknown) => void) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 800 400'); svg.setAttribute('aria-label', 'Overlaid XZ trajectories'); parent.append(svg);
  const points = runs.filter(r => r.visible).flatMap(r => r.history?.segments.flatMap(s => s.samples) ?? []);
  const bounds = points.reduce((b, p) => ({ minX: Math.min(b.minX, p.position.x), minZ: Math.min(b.minZ, p.position.z), maxX: Math.max(b.maxX, p.position.x), maxZ: Math.max(b.maxZ, p.position.z) }), { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity });
  const { minX, minZ } = bounds;
  const scale = Math.min(760 / (bounds.maxX - minX || 1), 360 / (bounds.maxZ - minZ || 1));
  runs.forEach((run, index) => {
    if (!run.visible) return;
    run.history?.segments.forEach(segment => {
      const path = document.createElementNS(svg.namespaceURI, 'polyline');
      path.setAttribute('points', segment.samples.map(s => `${20 + (s.position.x - minX) * scale},${380 - (s.position.z - minZ) * scale}`).join(' '));
      path.setAttribute('stroke', color(index)); path.setAttribute('fill', 'none'); path.setAttribute('stroke-width', '4');
      path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button'); path.setAttribute('aria-label', `${run.name}: segment ${segment.id} ${segment.command.name}`);
      path.addEventListener('click', () => inspect({ run: run.name, segment }));
      path.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') inspect({ run: run.name, segment }); });
      svg.append(path);
    });
  });
}
function timelines(parent: HTMLElement, run: Run, inspect: (value: unknown) => void) {
  element(parent, 'h3', run.name);
  element(parent, 'pre', JSON.stringify(measurements(run), null, 2));
  element(parent, 'p', `Export metadata: ${JSON.stringify(run.manifest ?? 'Unavailable')}`);
  if (run.entries) element(parent, 'pre', JSON.stringify(sessionSummary(run.entries), null, 2));
  element(parent, 'p', run.warnings.join('\n'));
  element(parent, 'h4', 'Observed navigation — independent simulation seconds');
  const nav = element(parent, 'div'); nav.className = 'comparison-lane';
  run.history?.segments.forEach(segment => {
    const group = element(nav, 'div');
    button(group, `#${segment.id} ${segment.samples[0]?.time ?? '?'}s: ${segment.command.name} → ${segment.outcome}`, () => inspect({ run: run.name, segment }));
    if (Array.isArray(segment.events)) segment.events.forEach(event => button(group, `${event.time}s ${event.state}`, () => inspect({ run: run.name, segmentId: segment.id, event })));
  });
  element(parent, 'h4', 'Session log order — not aligned to navigation or other runs');
  const log = element(parent, 'div'); log.className = 'comparison-lane';
  sessionEvents(run).forEach((event, index) => button(log, `${index + 1}. ${event.label}`, () => inspect({ run: run.name, ...event.evidence })));
}
export function createComparison(parent: HTMLElement) {
  const runs: Run[] = [];
  element(parent, 'h2', 'Compare experiments');
  element(parent, 'p', 'Add one export at a time, or select a parent directory containing exports. Each directory becomes a separate run; loose files in one selection form one run. Imports are local and additive.');
  const files = element(parent, 'input') as HTMLInputElement; files.type = 'file'; files.multiple = true; files.accept = '.json,.jsonl'; files.setAttribute('aria-label', 'Add comparison run files');
  const dirs = element(parent, 'input') as HTMLInputElement; dirs.type = 'file'; dirs.multiple = true; dirs.setAttribute('webkitdirectory', ''); dirs.setAttribute('aria-label', 'Add comparison directories');
  element(parent, 'p', 'Decision evidence: compare command choices, destinations and outcomes, then inspect session statements and tool results. Differences are candidates for human investigation, not inferred causes. No automatic decision alignment. Same mission, seed and coordinate frame must be verified from metadata and prompts.');
  element(parent, 'p', 'Distance is sampled 3D length excluding gaps; duration is retained sample span in seconds. Histories may be truncated or stale. Missing data is unavailable. Tool requests are not proof of successful action. Reasoning is an agent statement, not an observed cause. No shared call ID or synchronized clock links session and navigation.');
  const content = element(parent, 'div');
  element(parent, 'h3', 'Decision evidence workbench');
  element(parent, 'p', 'Select and pin decisions from different runs for side-by-side examination. Pins are your comparison choices, not a claim that events correspond. Different recorded commands and arguments remain visible in full.');
  const evidence = element(parent, 'pre', 'Select an event or route segment to inspect recorded evidence.');
  evidence.setAttribute('aria-live', 'polite');
  let selected: unknown;
  const pins = element(parent, 'div'); pins.className = 'comparison-lane';
  button(parent, 'Pin selected evidence', () => { if (selected) element(pins, 'pre', JSON.stringify(selected, null, 2)); });
  button(parent, 'Clear pins', () => pins.replaceChildren());
  function inspect(value: unknown) { selected = value; evidence.textContent = JSON.stringify(value, null, 2); }
  function render() {
    content.replaceChildren();
    element(content, 'p', `${runs.length} runs loaded. Select at least two for comparison. Each run has a distinct color; labels identify every run.`);
    runs.forEach((run, index) => {
      const row = element(content, 'div'); row.style.borderLeft = `8px solid ${color(index)}`;
      button(row, `${run.visible ? 'Hide' : 'Show'} ${run.name}`, () => { run.visible = !run.visible; render(); });
      button(row, 'Focus', () => { runs.forEach(r => { r.visible = r === run; }); render(); });
    });
    button(content, 'Show all', () => { runs.forEach(r => { r.visible = true; }); render(); });
    const table = element(content, 'table');
    const header = element(table, 'tr');
    ['Run', 'Sampled distance', 'Retained seconds', 'Tool calls', 'Completed', 'Interrupted', 'Blocked'].forEach(label => element(header, 'th', label));
    runs.filter(r => r.visible).forEach(run => {
      const row = element(table, 'tr');
      [run.name, ...Object.values(measurements(run))].forEach(value => element(row, 'td', String(value)));
    });
    map(content, runs, inspect);
    runs.filter(r => r.visible).forEach(run => timelines(content, run, inspect));
  }
  async function add(input: HTMLInputElement) {
    for (const [name, group] of groups(Array.from(input.files ?? []))) runs.push(await loadRun(`${runs.length + 1}: ${name}`, group));
    input.value = ''; render();
  }
  [files, dirs].forEach(input => input.addEventListener('change', () => { void add(input); }));
  render();
}
