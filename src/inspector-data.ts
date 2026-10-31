import type { TrajectoryHistory, Segment, Sample } from './trajectory';

export function record(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}
function vector(value: unknown) {
  const v = record(value);
  return ['x', 'y', 'z'].every(key => typeof v[key] === 'number' && Number.isFinite(v[key]));
}
function sample(value: unknown): value is Sample {
  const s = record(value);
  return typeof s.time === 'number' && Number.isFinite(s.time) && s.time >= 0 && vector(s.position) && vector(s.orientation);
}
function validSamples(value: unknown) {
  if (!Array.isArray(value) || !value.every(sample)) return false;
  return value.every((s, i) => i === 0 || s.time >= value[i - 1].time);
}
function segment(value: unknown): value is Segment {
  const s = record(value), command = record(s.command);
  const basics = Number.isInteger(s.id) && typeof command.name === 'string' && Array.isArray(command.args);
  const outcome = ['active', 'completed', 'interrupted', 'blocked'].includes(String(s.outcome));
  return basics && outcome && validSamples(s.samples) && (s.destination === undefined || vector(s.destination));
}
export function parseTrajectory(value: unknown): TrajectoryHistory {
  const h = record(value);
  if (h.version !== 1 || h.units !== 'seconds' || typeof h.startedAt !== 'string') throw new Error('Unsupported trajectory header');
  if (!Array.isArray(h.segments) || !h.segments.every(segment)) throw new Error('Invalid trajectory segments');
  return h as unknown as TrajectoryHistory;
}
export function parseSession(text: string) {
  const entries: Record<string, unknown>[] = [], warnings: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const entry = record(JSON.parse(line));
      if (typeof entry.type !== 'string') throw new Error('Missing entry type');
      entries.push(entry);
    } catch { warnings.push(`Invalid session line ${index + 1}`); }
  });
  return { entries, warnings };
}
export function blocks(message: Record<string, unknown>) {
  if (typeof message.content === 'string') return [{ type: 'text', text: message.content }];
  if (Array.isArray(message.content)) return message.content.map(record);
  return [];
}
function messageTask(message: Record<string, unknown>) {
  if (message.role !== 'user') return '';
  return blocks(message).map(b => b.text).filter(v => typeof v === 'string').join('\n');
}
function addModel(models: Set<string>, value: unknown) {
  if (typeof value === 'string') models.add(value);
}
export function sessionSummary(entries: Record<string, unknown>[]) {
  const models = new Set<string>(), tools = new Map<string, number>();
  let task = '';
  for (const entry of entries) {
    addModel(models, entry.modelId);
    const message = record(entry.message);
    addModel(models, message.model);
    task ||= messageTask(message);
    blocks(message).filter(b => b.type === 'toolCall').forEach(b => {
      const name = String(b.name); tools.set(name, (tools.get(name) ?? 0) + 1);
    });
  }
  return { models: [...models], task, tools: Object.fromEntries(tools) };
}
export function analyzeTrajectory(history: TrajectoryHistory) {
  let distance = 0, first = Infinity, last = -Infinity;
  const outcomes = new Map<string, number>();
  for (const s of history.segments) {
    outcomes.set(s.outcome, (outcomes.get(s.outcome) ?? 0) + 1);
    s.samples.forEach((p, i) => {
      first = Math.min(first, p.time); last = Math.max(last, p.time);
      if (i === 0) return;
      const previous = s.samples[i - 1].position;
      distance += Math.hypot(p.position.x - previous.x, p.position.y - previous.y, p.position.z - previous.z);
    });
  }
  return { distance, duration: Number.isFinite(first) ? last - first : null, outcomes: Object.fromEntries(outcomes) };
}
// Existing exports have no shared tool-call ID or synchronized simulation clock.
export function association() { return 'Unknown: exports contain no shared call identifier or synchronized clock.'; }
