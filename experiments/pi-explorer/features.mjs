import { names } from './core.mjs';

export const worldFeature = {
  tools: names,
  builtinTools: [],
  instructions:
    'Explore the simulated WorldGL environment. Use the WorldGL tools to observe and interact with the world. ' +
    'Command acceptance is not movement completion. Check navigation status or observed position before claiming arrival. ' +
    'Movement replaces existing navigation unless queued; rotation interrupts movement. stop_movement clears navigation and rotation. ' +
    'execute_route waits for completion or termination; other movement and rotation tools return immediately. Rotation completion is not tracked by navigation status.',
};

export const codingFeature = {
  tools: ['read', 'write', 'bash'],
  builtinTools: ['read', 'write', 'bash'],
  instructions:
    'You may write and execute your own Node.js scripts, functions and modules using read, write and bash. ' +
    'Keep all intended file modifications within your current workspace. Files here persist between runs. ' +
    'Do not modify WorldGL core or the experiment adapter. Use only the WorldGL tools for world observation and interaction; do not bypass them through scripts or browser access.',
};

export const modes = {
  worldOnly: [worldFeature],
  worldWithCoding: [worldFeature, codingFeature],
};

export function composeMode(name = 'worldOnly') {
  if (!Object.hasOwn(modes, name)) {
    throw new Error(`Unknown explorer mode: ${name}`);
  }
  const features = modes[name];
  const builtinTools = features.flatMap((feature) => feature.builtinTools);
  const instructions = features.map((feature) => feature.instructions);

  if (!builtinTools.length) {
    instructions.push('Use only the WorldGL tools. You have no filesystem, shell, DOM or arbitrary JavaScript tools.');
  }

  return {
    name,
    tools: features.flatMap((feature) => feature.tools),
    builtinTools,
    persistentWorkspace: builtinTools.length > 0,
    systemPrompt: instructions.join('\n\n'),
  };
}

export function restrictTools(pi, mode) {
  pi.setActiveTools(mode.tools);
  const actual = pi.getActiveTools().slice().sort();

  if (JSON.stringify(actual) !== JSON.stringify([...mode.tools].sort())) {
    throw new Error('Explorer tool isolation check failed');
  }
}
