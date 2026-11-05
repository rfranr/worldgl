import { spawn, execFileSync } from 'node:child_process';
import { composeMode } from './features.mjs';
import { launchArguments, prepareWorkspace } from './launch-config.mjs';
import { createInterface } from 'node:readline/promises';

function listModels() {
  const output = execFileSync('pi', ['--list-models'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  // Pi displays a table with Provider and Model columns.
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([provider, model]) => ({
      provider,
      model,
      id: `${provider}/${model}`,
    }));
}

async function chooseModel(rl, matches) {
  console.log('\n0. Use Pi default model');
  matches.forEach((model, index) => console.log(`${index + 1}. ${model.id}`));
  const choice = (await rl.question('\nSelect model number: ')).trim();

  if (choice === '0') {
    return null;
  }
  const number = Number(choice);

  if (!/^[1-9]\d*$/.test(choice) || number > matches.length) {
    console.log('Invalid selection.');

    return undefined;
  }

  return matches[number - 1];
}

async function filterModels(rl, models) {
  while (true) {
    const filter = (await rl.question('\nFilter models (Enter = all): ')).trim().toLowerCase();
    const matches = models.filter((model) => model.id.toLowerCase().includes(filter));

    if (!matches.length) {
      console.log('No matching models.');
      continue;
    }
    const selected = await chooseModel(rl, matches);

    if (selected !== undefined) {
      return selected;
    }
  }
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

    const mode = await selectMode(rl);
    const model = await filterModels(rl, models);

    return { mode, model };
  } finally {
    rl.close();
  }
}

async function selectMode(rl) {
  while (true) {
    const choice = (await rl.question('\n1. World Only\n2. World + Coding\nSelect mode (Enter = 1): ')).trim();

    if (choice === '' || choice === '1') {
      return composeMode('worldOnly');
    }
    if (choice === '2') {
      return composeMode('worldWithCoding');
    }

    console.log('Invalid selection.');
  }
}

const { mode, model: selected } = await selectModel();
const args = launchArguments(mode, selected);

console.log(`\nLaunching ${mode.name} with ${selected?.id ?? 'Pi default'}\n`);
const { cwd, cleanup } = prepareWorkspace(mode);

const child = spawn('pi', args, {
  cwd,
  stdio: 'inherit',
  env: { ...process.env, WORLDGL_EXPLORER_MODE: mode.name },
});

child.on('error', (error) => {
  console.error(error.message);
  cleanup();
  process.exitCode = 1;
});

child.on('exit', (code) => {
  cleanup();
  process.exitCode = code ?? 1;
});
