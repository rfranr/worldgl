import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { names } from './core.mjs';
import { composeMode, restrictTools, modes, worldFeature, codingFeature } from './features.mjs';
import { launchArguments, prepareWorkspace } from './launch-config.mjs';

test('modes compose the same world tools with exactly the requested coding tools', () => {
  assert.deepEqual(modes, { worldOnly: [worldFeature], worldWithCoding: [worldFeature, codingFeature] });
  assert.deepEqual(composeMode().tools, names);
  assert.deepEqual(composeMode('worldWithCoding').tools, [...names, 'read', 'write', 'bash']);
  assert.throws(() => composeMode('toString'), /Unknown explorer mode/);
});

test('tool restrictions restore the exact composed allowlist and detect missing tools', () => {
  for (const name of Object.keys(modes)) {
    const mode = composeMode(name);
    let active = ['edit', 'bash'];
    const pi = {
      setActiveTools: (tools) => {
        active = [...tools];
      },
      getActiveTools: () => active,
    };

    restrictTools(pi, mode);
    assert.deepEqual(active, mode.tools);
    assert.throws(() => restrictTools({ setActiveTools() {}, getActiveTools: () => [] }, mode), /isolation/);
  }
});

test('launcher keeps isolation controls and model selection in both modes', () => {
  for (const name of Object.keys(modes)) {
    const mode = composeMode(name);
    const args = launchArguments(mode, { provider: 'provider', model: 'model' });

    for (const flag of [
      '--no-extensions',
      '--no-mcp',
      '--no-skills',
      '--no-prompt-templates',
      '--no-context-files',
      '--no-session',
    ]) {
      assert.ok(args.includes(flag));
    }
    assert.deepEqual(args.slice(-4), ['--provider', 'provider', '--model', 'model']);
    assert.equal(args[args.indexOf('--system-prompt') + 1], mode.systemPrompt);
    assert.equal(args.includes('--no-builtin-tools'), name === 'worldOnly');
    assert.equal(args.includes('--tools'), name === 'worldWithCoding');

    if (name === 'worldWithCoding') {
      assert.equal(args[args.indexOf('--tools') + 1], mode.tools.join(','));
    }
  }
});

test('coding workspace executes Node.js and survives cleanup and subsequent runs', () => {
  const root = mkdtempSync(join(process.cwd(), '.workspace-test-'));
  const directory = join(root, 'workspace');
  const mode = composeMode('worldWithCoding');

  try {
    const first = prepareWorkspace(mode, directory);

    writeFileSync(join(first.cwd, 'hello.cjs'), 'console.log("hello");');
    assert.equal(execFileSync(process.execPath, ['hello.cjs'], { cwd: first.cwd, encoding: 'utf8' }).trim(), 'hello');
    first.cleanup();
    const second = prepareWorkspace(mode, directory);

    assert.equal(readFileSync(join(second.cwd, 'hello.cjs'), 'utf8'), 'console.log("hello");');
    second.cleanup();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('world-only workspace is temporary and removed on cleanup', () => {
  const workspace = prepareWorkspace(composeMode());

  assert.ok(existsSync(workspace.cwd));
  workspace.cleanup();
  assert.equal(existsSync(workspace.cwd), false);
});
