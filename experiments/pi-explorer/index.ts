import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from '@earendil-works/pi-ai';
import { chromium } from 'playwright';
import { WorldBrowser, names } from './core.mjs';
import { ExperimentExport } from './export.mjs';
import { composeMode, restrictTools } from './features.mjs';

function registerWorldTools(pi: ExtensionAPI, browser: WorldBrowser) {
  const empty = Type.Object({}, { additionalProperties: false });
  const schemas = {
    execute_route: Type.Object(
      {
        waypoints: Type.Array(
          Type.Object(
            {
              x: Type.Number({ minimum: -118, maximum: 118 }),
              y: Type.Number({ minimum: -65, maximum: 65 }),
              z: Type.Number({ minimum: -118, maximum: 118 }),
            },
            { additionalProperties: false },
          ),
          { minItems: 1, maxItems: 65 },
        ),
      },
      { additionalProperties: false },
    ),
    inspect_world: empty,
    move_by: Type.Object(
      {
        forward: Type.Optional(Type.Number()),
        right: Type.Optional(Type.Number()),
        up: Type.Optional(Type.Number()),
      },
      { additionalProperties: false },
    ),
    move_to: Type.Object(
      {
        queue: Type.Optional(Type.Boolean()),
        x: Type.Number({ minimum: -118, maximum: 118 }),
        y: Type.Number({ minimum: -65, maximum: 65 }),
        z: Type.Number({ minimum: -118, maximum: 118 }),
      },
      { additionalProperties: false },
    ),
    turn_by: Type.Object({ radians: Type.Number() }, { additionalProperties: false }),
    look_at: Type.Object({ x: Type.Number(), y: Type.Number(), z: Type.Number() }, { additionalProperties: false }),
    navigation_status: empty,
    stop_movement: empty,
  };
  const descriptions = {
    execute_route:
      'Replace navigation with 1–65 ordered waypoints. Waits asynchronously for completion or termination, returning final state, completed waypoint count and outcomes. Ten-minute timeout; stop_movement cancels the route.',
    inspect_world:
      'Observe seed, player and currently visible objects: 90° horizontal field of view, 60 world-unit range. Turn or move to discover objects. Y is up.',
    move_by:
      'Start asynchronous movement relative to player heading: forward, right, up, in world units. Omitted components default to zero. Replaces any previous destination; returns immediately.',
    move_to:
      'Start asynchronous movement to absolute x, y, z coordinates. Defaults to replacing movement; queue:true appends (64 pending maximum). Returns acceptance and command ID immediately.',
    navigation_status:
      'Read navigation state (idle, moving, arrived, blocked) and optional target. Does not wait for arrival.',
    turn_by:
      'Progressively rotate heading by radians (positive turns left). Replaces movement or rotation; returns immediately.',
    look_at:
      'Progressively face a world position in the horizontal plane (Y is up). Replaces movement or rotation; returns immediately.',
    stop_movement: 'Abort current movement and rotation and clear all queued commands immediately.',
  };

  for (const name of names) {
    pi.registerTool({
      name,
      label: name,
      description: descriptions[name],
      parameters: schemas[name],
      async execute(_id, args, signal) {
        return browser.call(name, args, { signal });
      },
    });
  }
}

export default function (pi: ExtensionAPI) {
  const mode = composeMode(process.env.WORLDGL_EXPLORER_MODE);
  const browser = new WorldBrowser(chromium, process.env.WORLDGL_URL);
  let exporter: ExperimentExport;
  let completed = false;
  const checkpoint = async (ctx, status) => {
    try {
      await exporter?.save(ctx, browser, status);
    } catch (error) {
      ctx.ui.notify(`Experiment export failed: ${error.message}`, 'error');
    }
  };

  pi.registerCommand('export-experiment', {
    description: 'Save this exploration for offline analysis (human only)',
    handler: async (_args, ctx) => {
      await checkpoint(ctx, completed ? 'completed' : 'interrupted');
      ctx.ui.notify(`Experiment directory: ${exporter.directory}`, 'info');
    },
  });
  pi.on('agent_start', () => {
    completed = false;
  });
  pi.on('turn_end', async (_event, ctx) => {
    await checkpoint(ctx, 'in-progress');
  });
  pi.on('agent_settled', async (_event, ctx) => {
    const last = ctx.sessionManager
      .getEntries()
      .filter((e) => e.type === 'message' && e.message.role === 'assistant')
      .at(-1);

    completed = last?.message.stopReason === 'stop';
    await checkpoint(ctx, completed ? 'completed' : 'interrupted');
  });
  registerWorldTools(pi, browser);
  function restrict() {
    restrictTools(pi, mode);
  }
  pi.on('session_start', async (_event, ctx) => {
    restrict();
    ctx.ui.notify(`Explorer tools verified: ${mode.tools.join(', ')}`, 'info');
    exporter = new ExperimentExport();
    await browser.start();
    await browser.page.evaluate(() => window.worldDebug.trajectory.start());
    await checkpoint(ctx, 'in-progress');
  });
  pi.on('before_agent_start', () => {
    restrict();
  });
  pi.on('tool_call', (event) => {
    if (!mode.tools.includes(event.toolName)) {
      return { block: true, reason: 'Tool is not permitted in this exploration mode' };
    }
  });
  pi.on('session_shutdown', async (_event, ctx) => {
    await checkpoint(ctx, completed ? 'completed' : 'interrupted');
    await browser.close();
  });
}
