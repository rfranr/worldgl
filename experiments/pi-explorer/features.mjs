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
    'Use read, write and bash freely to create and execute your own scripts, functions and modules in your workspace. ' +
    'Writing code does not execute it. When you use code to calculate or validate a route, run it with bash and inspect its output; fix execution errors before relying on the result. ' +
    'Calculated waypoints are a plan, not evidence of movement. Submit movement through the WorldGL tools, inspect the actual outcomes and verify observed positions before claiming success. ' +
    'Continue from calculation to execution and verification unless blocked or explicitly asked only to plan. If execution or verification is incomplete, report that limitation instead of claiming completion. ' +
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
