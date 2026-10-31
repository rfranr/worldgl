import { record, blocks, parseSession, parseTrajectory, sessionSummary, analyzeTrajectory, association } from './inspector-data';
import { createTrajectoryMap } from './trajectory-map';
import type { TrajectoryHistory } from './trajectory';
import './inspector.css';

const output = document.querySelector<HTMLElement>('#output')!;
function text(parent: HTMLElement, tag: string, value: string) {
  const element = document.createElement(tag); element.textContent = value; parent.append(element); return element;
}
function showTrajectory(history: TrajectoryHistory, parent: HTMLElement) {
  text(parent, 'pre', JSON.stringify(analyzeTrajectory(history), null, 2));
  text(parent, 'p', 'XZ map (Y is altitude). Distance is sampled 3D path length; duration is the retained sample time span. Gaps between segments are not counted.');
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Recorded trajectory, XZ plane'); parent.append(canvas);
  const draw = createTrajectoryMap(canvas);
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Trajectory segment'); parent.append(select);
  const details = text(parent, 'pre', '');
  ['All segments', ...history.segments.map(s => `${s.id}: ${s.command.name} — ${s.outcome}`)].forEach((label, i) => {
    const option = document.createElement('option'); option.value = String(i - 1); option.textContent = label; select.append(option);
  });
  function update() {
    const selected = history.segments[Number(select.value)];
    draw({ ...history, segments: selected ? [selected] : history.segments }, { visible: true, destinationsVisible: true });
    details.textContent = selected ? JSON.stringify(selected, null, 2) : 'All retained segments';
  }
  select.addEventListener('change', update); update();
}
function showMessage(entry: Record<string, unknown>, parent: HTMLElement) {
  const message = record(entry.message);
  if (!message.role) return;
  const section = document.createElement('details'); parent.append(section);
  text(section, 'summary', `${String(entry.timestamp ?? '')} ${String(message.role)} ${String(message.toolCallId ?? '')}`);
  text(section, 'pre', JSON.stringify(message, null, 2));
  blocks(message).filter(b => b.type === 'toolCall').forEach(call => {
    const button = text(section, 'button', `Inspect call ${String(call.name)} (${String(call.id)})`);
    button.addEventListener('click', () => { status.textContent = association(); });
  });
}
const status = document.querySelector<HTMLElement>('#status')!;
function showSession(source: string, section: HTMLElement) {
  const session = parseSession(source);
  text(section, 'pre', JSON.stringify(sessionSummary(session.entries), null, 2));
  text(section, 'p', session.warnings.join('\n'));
  session.entries.forEach(entry => showMessage(entry, section));
}
async function showFile(file: File, section: HTMLElement) {
  if (file.size > 20 * 1024 * 1024) throw new Error('File exceeds 20 MiB limit');
  const source = await file.text();
  if (file.name.endsWith('.jsonl')) showSession(source, section);
  else showJSON(JSON.parse(source), section);
}
async function inspectFile(file: File, parent: HTMLElement) {
  const name = file.webkitRelativePath || file.name;
  if (!/\.(json|jsonl)$/i.test(name)) return;
  const section = document.createElement('section'); parent.append(section); text(section, 'h2', name);
  try {
    await showFile(file, section);
  } catch (error) { text(section, 'p', `Cannot inspect: ${String(error)}`); }
}
function showJSON(value: unknown, section: HTMLElement) {
  const data = record(value);
  if ('segments' in data) { showTrajectory(parseTrajectory(value), section); return; }
  if (Array.isArray(data.entries)) {
    const entries = data.entries.map(record);
    text(section, 'pre', JSON.stringify(sessionSummary(entries), null, 2));
    entries.forEach(entry => showMessage(entry, section)); return;
  }
  text(section, 'p', 'Metadata / unsupported artifact (not used for trajectory correlation)');
  text(section, 'pre', JSON.stringify(value, null, 2));
}
let generation = 0;
async function importFiles(input: HTMLInputElement) {
  const current = ++generation, container = document.createElement('div'); output.replaceChildren(container);
  status.textContent = 'Reading local files only…';
  for (const file of Array.from(input.files ?? [])) {
    if (current !== generation) return;
    await inspectFile(file, container);
  }
  if (current === generation) status.textContent = `Import complete. ${association()}`;
}
document.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => {
  input.addEventListener('change', () => { void importFiles(input); });
});
