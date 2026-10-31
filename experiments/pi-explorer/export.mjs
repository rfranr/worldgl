import { mkdir, writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
export function metrics(entries, trajectory) {
  const result = { toolCalls: {}, toolErrors: 0, assistantMessages: 0, models: [], usage: {}, navigation: { segments: 0, samples: 0, distance: 0, outcomes: {} } };
  for (const { message: m } of entries) {
    if (!m) continue;
    if (m.role === 'assistant') {
      result.assistantMessages++;
      const model = `${m.provider}/${m.model}`;
      if (!result.models.includes(model)) result.models.push(model);
      for (const part of m.content ?? []) if (part.type === 'toolCall') result.toolCalls[part.name] = (result.toolCalls[part.name] ?? 0) + 1;
      for (const [key, value] of Object.entries(m.usage ?? {})) {
        if (typeof value === 'number') result.usage[key] = (result.usage[key] ?? 0) + value;
        else if (key === 'cost') for (const [k, v] of Object.entries(value ?? {})) if (typeof v === 'number') {
          result.usage.cost ??= {}; result.usage.cost[k] = (result.usage.cost[k] ?? 0) + v;
        }
      }
    }
    if (m.role === 'toolResult' && m.isError) result.toolErrors++;
  }
  for (const segment of trajectory?.segments ?? []) {
    const nav = result.navigation;
    nav.segments++; nav.samples += segment.samples.length;
    nav.outcomes[segment.outcome] = (nav.outcomes[segment.outcome] ?? 0) + 1;
    for (let i = 1; i < segment.samples.length; i++) {
      const a = segment.samples[i - 1].position, b = segment.samples[i].position;
      nav.distance += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    }
  }
  return result;
}

export class ExperimentExport {
  constructor() {
    this.startedAt = new Date().toISOString();
    this.directory = join(root, 'experiments/pi-explorer/exports', `${this.startedAt.replaceAll(':', '-')}-${randomUUID()}`);
    try { this.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { this.commit = null; }
    this.queue = Promise.resolve();
  }
  save(ctx, browser, status) {
    const task = this.queue.then(() => this.snapshot(ctx, browser, status));
    this.queue = task.catch(() => {});
    return task;
  }
  async snapshot(ctx, browser, status) {
    const entries = ctx.sessionManager.getEntries();
    const header = ctx.sessionManager.getHeader();
    let data = null;
    try {
      data = await browser.page.evaluate(() => ({ seed: window.world.inspect().seed, trajectory: window.worldDebug.trajectory.getHistory() }));
      this.lastData = data;
    } catch { /* Retain last successful checkpoint when the browser disconnects. */ }
    const stale = !data;
    data ??= this.lastData;
    const prompt = entries.find(e => e.message?.role === 'user')?.message;
    const text = typeof prompt?.content === 'string' ? prompt.content : (prompt?.content ?? []).filter(p => p.type === 'text').map(p => p.text).join('\n');
    const summary = metrics(entries, data?.trajectory);
    const manifest = {
      version: 1, startedAt: this.startedAt, exportedAt: new Date().toISOString(), status,
      complete: status === 'completed' && !stale && Boolean(prompt),
      gitCommit: this.commit, worldSeed: data?.seed ?? null,
      sessionId: ctx.sessionManager.getSessionId(), leafId: ctx.sessionManager.getLeafId(),
      model: ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : null,
      configuration: { tools: browser.constructor.name === 'WorldBrowser' ? ['inspect_world', 'move_by', 'move_to', 'execute_route', 'navigation_status', 'stop_movement', 'turn_by', 'look_at'] : [], headless: false },
      availability: { prompt: Boolean(prompt), trajectory: Boolean(data), trajectoryStale: stale, usage: Object.keys(summary.usage).length > 0 },
      limitations: ['Trajectory is the native bounded history (64 segments, 1000 samples per segment); distance is sampled and excludes gaps.', 'Usage and cost are provider-reported; missing values are unavailable, not zero.'],
    };
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = { 'prompt.txt': text, 'session.jsonl': [header, ...entries].filter(Boolean).map(e => JSON.stringify(e)).join('\n') + '\n', 'trajectory.json': JSON.stringify(data?.trajectory ?? null, null, 2), 'metrics.json': JSON.stringify(summary, null, 2), 'manifest.json': JSON.stringify(manifest, null, 2) };
    // Manifest is committed last. Each artifact is replaced atomically.
    for (const [name, contents] of Object.entries(files)) {
      const path = join(this.directory, name);
      await writeFile(path + '.tmp', contents, { mode: 0o600 });
      await rename(path + '.tmp', path);
    }
    return this.directory;
  }
}
