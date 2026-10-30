import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A clean working directory prevents repository context from entering the prompt.
const cwd = mkdtempSync(join(tmpdir(), 'worldgl-explorer-'));
const child = spawn('pi', [
  '--no-builtin-tools', '--no-extensions', '--no-mcp', '--no-skills',
  '--no-prompt-templates', '--no-context-files', '--no-session',
  '--extension', fileURLToPath(new URL('./index.ts', import.meta.url)),
  '--system-prompt', 'You are exploring a simulated world. Use only the five world tools. You have no filesystem, shell, DOM, or arbitrary JavaScript tools.',
], { cwd, stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error.message); rmSync(cwd, { recursive: true, force: true }); process.exitCode = 1; });
child.on('exit', code => { rmSync(cwd, { recursive: true, force: true }); process.exitCode = code ?? 1; });
