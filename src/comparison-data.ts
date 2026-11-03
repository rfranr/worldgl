import { analyzeTrajectory, blocks, parseSession, parseTrajectory, record, sessionSummary } from './inspector-data';
import type { TrajectoryHistory } from './trajectory';
export type Run = {
  name: string;
  visible: boolean;
  history?: TrajectoryHistory;
  entries?: Record<string, unknown>[];
  warnings: string[];
  manifest?: Record<string, unknown>;
};
export function groups(files: File[]) {
  const result = new Map<string, File[]>();

  for (const file of files) {
    const path = file.webkitRelativePath;
    const key = path ? path.slice(0, path.lastIndexOf('/')) : 'Selected files';
    const group = result.get(key) ?? [];

    group.push(file);
    result.set(key, group);
  }

  return result;
}

export async function loadRun(name: string, files: File[]): Promise<Run> {
  const run: Run = { name, visible: true, warnings: [] };

  for (const file of files) {
    await readArtifact(run, file).catch((error) => {
      run.warnings.push(`${file.name}: ${String(error)}`);
    });
  }

  return run;
}
async function readArtifact(run: Run, file: File) {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('File exceeds 20 MiB');
  }
  if (!/\.(json|jsonl)$/i.test(file.name)) {
    return;
  }
  const source = await file.text();

  if (file.name.endsWith('.jsonl')) {
    const session = parseSession(source);

    run.entries = session.entries;
    run.warnings.push(...session.warnings);
  } else {
    assignJSON(run, JSON.parse(source));
  }
}

function assignJSON(run: Run, value: unknown) {
  const data = record(value);

  if ('segments' in data) {
    run.history = parseTrajectory(value);

    return;
  }
  if (Array.isArray(data.entries)) {
    run.entries = data.entries.map(record);

    return;
  }
  if ('sessionId' in data) {
    run.manifest = data;
  }
}

export function measurements(run: Run) {
  const trajectory = run.history ? analyzeTrajectory(run.history) : undefined;
  const summary = run.entries ? sessionSummary(run.entries) : undefined;

  return {
    distance: trajectory?.distance ?? 'Unavailable',
    duration: trajectory?.duration ?? 'Unavailable',
    toolCalls: summary ? Object.values(summary.tools).reduce((a, b) => a + b, 0) : 'Unavailable',
    ...outcomeCounts(trajectory),
  };
}

function outcomeCounts(trajectory: ReturnType<typeof analyzeTrajectory> | undefined) {
  if (!trajectory) {
    return { completed: 'Unavailable', interrupted: 'Unavailable', blocked: 'Unavailable' };
  }

  return {
    completed: trajectory.outcomes.completed ?? 0,
    interrupted: trajectory.outcomes.interrupted ?? 0,
    blocked: trajectory.outcomes.blocked ?? 0,
  };
}

export function sessionEvents(run: Run) {
  return (run.entries ?? []).flatMap((entry, index) => {
    const message = record(entry.message);

    return blocks(message).map((block) => ({
      label:
        block.type === 'toolCall'
          ? `Requested action: ${String(block.name)}`
          : `${String(message.role)} / ${String(block.type)} (recorded statement or result)`,
      evidence: { logIndex: index, timestamp: entry.timestamp, entry },
    }));
  });
}
