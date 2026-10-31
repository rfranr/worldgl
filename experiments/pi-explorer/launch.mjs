
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

function listModels() {
  const output = execFileSync('pi', ['--list-models'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  // Pi displays a table with Provider and Model columns.
  return output.split(/\r?\n/)
    .slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(parts => parts.length >= 2)
    .map(([provider, model]) => ({
      provider,
      model,
      id: `${provider}/${model}`,
    }));
}

async function selectModel() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const models = listModels();

    if (!models.length) {
      throw new Error('Pi returned no models.');
    }

    while (true) {
      const filter = (
        await rl.question('\nFilter models (Enter = all): ')
      ).trim().toLowerCase();

      const matches = models.filter(m =>
        m.id.toLowerCase().includes(filter)
      );

      if (!matches.length) {
        console.log('No matching models.');
        continue;
      }

      console.log('\n0. Use Pi default model');

      matches.forEach((m, index) => {
        console.log(`${index + 1}. ${m.id}`);
      });

      const choice = (
        await rl.question('\nSelect model number: ')
      ).trim();

      if (choice === '0') return null;

      const number = Number(choice);
      if (
        !/^[1-9]\d*$/.test(choice) ||
        number > matches.length
      ) {
        console.log('Invalid selection.');
        continue;
      }

      return matches[number - 1];
    }
  } finally {
    rl.close();
  }
}

const selected = await selectModel();

const args = [
  '--no-builtin-tools',
  '--no-extensions',
  '--no-mcp',
  '--no-skills',
  '--no-prompt-templates',
  '--no-context-files',
  '--no-session',
  '--extension', fileURLToPath(new URL('./index.ts', import.meta.url)),
  '--system-prompt',
  'You are exploring a simulated world. Use only the five world tools. You have no filesystem, shell, DOM, or arbitrary JavaScript tools.',
];

if (selected) {
  args.push('--provider', selected.provider);
  args.push('--model', selected.model);
}

console.log(
  `\nLaunching explorer with ${selected?.id ?? 'Pi default'}\n`
);

// Keep the agent isolated from repository context.
const cwd = mkdtempSync(join(tmpdir(), 'worldgl-explorer-'));

function cleanup() {
  rmSync(cwd, { recursive: true, force: true });
}

const child = spawn('pi', args, {
  cwd,
  stdio: 'inherit',
  env: process.env,
});

child.on('error', error => {
  console.error(error.message);
  cleanup();
  process.exitCode = 1;
});

child.on('exit', code => {
  cleanup();
  process.exitCode = code ?? 1;
});
