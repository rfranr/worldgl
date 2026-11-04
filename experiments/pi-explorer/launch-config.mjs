import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function launchArguments(mode, selected) {
  const tools = mode.builtinTools.length ? ['--tools', mode.tools.join(',')] : ['--no-builtin-tools'];
  const args = [
    ...tools,
    '--no-extensions',
    '--no-mcp',
    '--no-skills',
    '--no-prompt-templates',
    '--no-context-files',
    '--no-session',
    '--extension',
    fileURLToPath(new URL('./index.ts', import.meta.url)),
    '--system-prompt',
    mode.systemPrompt,
  ];

  if (selected) {
    args.push('--provider', selected.provider, '--model', selected.model);
  }

  return args;
}

export function prepareWorkspace(mode, directory = fileURLToPath(new URL('./workspace/', import.meta.url))) {
  if (mode.persistentWorkspace) {
    mkdirSync(directory, { recursive: true });

    return { cwd: directory, cleanup() {} };
  }
  const cwd = mkdtempSync(join(tmpdir(), 'worldgl-explorer-'));

  return { cwd, cleanup: () => rmSync(cwd, { recursive: true, force: true }) };
}
