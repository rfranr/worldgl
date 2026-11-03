import { mkdir, writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));

function collectCosts(usage, costs) {
  for (const [key, value] of Object.entries(costs ?? {})) {
    if (typeof value !== 'number') {
      continue;
    }

    usage.cost ??= {};
    usage.cost[key] = (usage.cost[key] ?? 0) + value;
  }
}

function collectUsage(totals, usage) {
  for (const [key, value] of Object.entries(usage ?? {})) {
    if (typeof value === 'number') {
      totals[key] = (totals[key] ?? 0) + value;
    } else if (key === 'cost') {
      collectCosts(totals, value);
    }
  }
}

function collectToolCalls(totals, content) {
  for (const part of content ?? []) {
    if (part.type === 'toolCall') {
      totals[part.name] = (totals[part.name] ?? 0) + 1;
    }
  }
}

function collectAssistant(result, message) {
  result.assistantMessages++;
  const model = `${message.provider}/${message.model}`;

  if (!result.models.includes(model)) {
    result.models.push(model);
  }

  collectToolCalls(result.toolCalls, message.content);
  collectUsage(result.usage, message.usage);
}

function collectMessage(result, message) {
  if (!message) {
    return;
  }
  if (message.role === 'assistant') {
    collectAssistant(result, message);
  }
  if (message.role === 'toolResult' && message.isError) {
    result.toolErrors++;
  }
}

function collectSegment(nav, segment) {
  nav.segments++;
  nav.samples += segment.samples.length;
  nav.outcomes[segment.outcome] = (nav.outcomes[segment.outcome] ?? 0) + 1;

  for (let i = 1; i < segment.samples.length; i++) {
    const a = segment.samples[i - 1].position;
    const b = segment.samples[i].position;

    nav.distance += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
}

export function metrics(entries, trajectory) {
  const result = {
    toolCalls: {},
    toolErrors: 0,
    assistantMessages: 0,
    models: [],
    usage: {},
    navigation: { segments: 0, samples: 0, distance: 0, outcomes: {} },
  };

  for (const { message } of entries) {
    collectMessage(result, message);
  }

  for (const segment of trajectory?.segments ?? []) {
    collectSegment(result.navigation, segment);
  }

  return result;
}

function promptText(prompt) {
  if (typeof prompt?.content === 'string') {
    return prompt.content;
  }

  return (prompt?.content ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

export class ExperimentExport {
  constructor() {
    this.startedAt = new Date().toISOString();
    this.directory = join(
      root,
      'experiments/pi-explorer/exports',
      `${this.startedAt.replaceAll(':', '-')}-${randomUUID()}`,
    );
    try {
      this.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    } catch {
      this.commit = null;
    }
    this.queue = Promise.resolve();
  }
  save(ctx, browser, status) {
    const task = this.queue.then(() => this.snapshot(ctx, browser, status));

    this.queue = task.catch(() => {});

    return task;
  }
  async capture(browser) {
    try {
      const data = await browser.page.evaluate(() => ({
        seed: window.world.inspect().seed,
        trajectory: window.worldDebug.trajectory.getHistory(),
      }));

      this.lastData = data;

      return { data, stale: !data };
    } catch {
      // Retain last successful checkpoint when the browser disconnects.
      return { data: this.lastData, stale: true };
    }
  }
  async snapshot(ctx, browser, status) {
    const entries = ctx.sessionManager.getEntries();
    const header = ctx.sessionManager.getHeader();
    const { data, stale } = await this.capture(browser);
    const prompt = entries.find((e) => e.message?.role === 'user')?.message;
    const text = promptText(prompt);
    const summary = metrics(entries, data?.trajectory);
    const manifest = {
      version: 1,
      startedAt: this.startedAt,
      exportedAt: new Date().toISOString(),
      status,
      complete: status === 'completed' && !stale && Boolean(prompt),
      gitCommit: this.commit,
      worldSeed: data?.seed ?? null,
      sessionId: ctx.sessionManager.getSessionId(),
      leafId: ctx.sessionManager.getLeafId(),
      model: ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : null,
      configuration: {
        tools:
          browser.constructor.name === 'WorldBrowser'
            ? [
                'inspect_world',
                'move_by',
                'move_to',
                'execute_route',
                'navigation_status',
                'stop_movement',
                'turn_by',
                'look_at',
              ]
            : [],
        headless: false,
      },
      availability: {
        prompt: Boolean(prompt),
        trajectory: Boolean(data),
        trajectoryStale: stale,
        usage: Object.keys(summary.usage).length > 0,
      },
      limitations: [
        'Trajectory is the native bounded history (64 segments, 1000 samples per segment); distance is sampled and excludes gaps.',
        'Usage and cost are provider-reported; missing values are unavailable, not zero.',
      ],
    };

    return this.writeArtifacts({ text, header, entries, data, summary, manifest });
  }
  async writeArtifacts({ text, header, entries, data, summary, manifest }) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = {
      'prompt.txt': text,
      'session.jsonl':
        [header, ...entries]
          .filter(Boolean)
          .map((e) => JSON.stringify(e))
          .join('\n') + '\n',
      'trajectory.json': JSON.stringify(data?.trajectory ?? null, null, 2),
      'metrics.json': JSON.stringify(summary, null, 2),
      'manifest.json': JSON.stringify(manifest, null, 2),
    };

    // Manifest is committed last. Each artifact is replaced atomically.
    for (const [name, contents] of Object.entries(files)) {
      const path = join(this.directory, name);

      await writeFile(path + '.tmp', contents, { mode: 0o600 });
      await rename(path + '.tmp', path);
    }

    return this.directory;
  }
}
