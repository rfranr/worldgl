import { setTimeout as delay } from 'node:timers/promises';

export const names = [
  'inspect_world',
  'move_by',
  'move_to',
  'execute_route',
  'navigation_status',
  'stop_movement',
  'turn_by',
  'look_at',
];

const argumentKeys = {
  move_by: ['forward', 'right', 'up'],
  move_to: ['x', 'y', 'z'],
  look_at: ['x', 'y', 'z'],
  turn_by: ['radians'],
};

function validateRoute(args) {
  if (Object.keys(args).some((key) => key !== 'waypoints') || !Array.isArray(args.waypoints)) {
    throw new Error('Route requires 1 to 65 waypoints');
  }
  if (args.waypoints.length < 1 || args.waypoints.length > 65) {
    throw new Error('Route requires 1 to 65 waypoints');
  }

  for (const point of args.waypoints) {
    validate('move_to', point);

    if ('queue' in point) {
      throw new Error('Waypoint cannot specify queue');
    }
  }
}

function numericArguments(name, args) {
  const values = { ...args };

  if (name !== 'move_to' || !('queue' in values)) {
    return values;
  }
  if (typeof values.queue !== 'boolean') {
    throw new Error('queue must be boolean');
  }

  delete values.queue;

  return values;
}

function validateNumbers(keys, values) {
  for (const [key, value] of Object.entries(values)) {
    if (!keys.includes(key)) {
      throw new Error(`Unknown argument: ${key}`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${key} must be finite`);
    }
  }
}

function validateDestination(args) {
  if (Math.abs(args.x) > 118 || Math.abs(args.z) > 118 || Math.abs(args.y) > 65) {
    throw new Error('Destination outside world bounds');
  }
}

function validateCoordinates(name, args) {
  const keys = argumentKeys[name] ?? [];

  validateNumbers(keys, numericArguments(name, args));

  if (['move_to', 'look_at', 'turn_by'].includes(name) && keys.some((key) => !(key in args))) {
    throw new Error(`${name} requires ${keys.join(', ')}`);
  }
  if (name === 'move_to') {
    validateDestination(args);
  }
}

export function validate(name, args) {
  if (!names.includes(name)) {
    throw new Error('Unknown world tool');
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Expected an argument object');
  }
  if (name === 'execute_route') {
    return validateRoute(args);
  }

  validateCoordinates(name, args);
}

// Fixed page-side API dispatch; keep callbacks self-contained for Playwright.
export function worldOperation({ name, args }) {
  const world = window.world;

  if (!world) {
    throw new Error('world API unavailable; check the worldgl page');
  }
  const operations = {
    inspect_world: () => world.inspect(),
    move_by: () => {
      world.interact.moveBy(args);

      return { accepted: true };
    },
    execute_route: () => world.interact.executeRoute(args.waypoints),
    move_to: () => {
      if (args.queue) {
        return world.interact.moveTo(args, { queue: true });
      }

      world.interact.moveTo(args);

      return { accepted: true };
    },
    turn_by: () => {
      world.interact.turnBy(args);

      return { accepted: true };
    },
    look_at: () => {
      world.interact.lookAt(args);

      return { accepted: true };
    },
    navigation_status: () => world.interact.getNavigationStatus(),
    stop_movement: () => {
      (world.interact.abortNavigation ?? world.interact.stop)();

      return { stopped: true };
    },
  };

  if (!Object.hasOwn(operations, name)) {
    throw new Error('Unknown world tool');
  }

  return operations[name]();
}

export function format(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], details: data };
}

function routeSnapshot(status, previous) {
  if (status.route?.id === previous.id) {
    return status.route;
  }
  const outcomes = status.outcomes.filter((outcome) => previous.commandIds.includes(outcome.id));

  return {
    ...previous,
    state: 'interrupted',
    outcomes,
    completed: outcomes.filter((outcome) => outcome.outcome === 'arrived').length,
  };
}

function finalRoute(route) {
  return { ...route, state: route.state === 'arrived' ? 'completed' : route.state };
}

function stopRoute({ id }) {
  const interact = window.world?.interact;

  if (id === undefined || interact?.getNavigationStatus().route?.id !== id) {
    return;
  }

  (interact.abortNavigation ?? interact.stop)();

  return interact.getNavigationStatus().route;
}

async function boundedCleanup(page, route) {
  let timer;

  try {
    return await Promise.race([
      page.evaluate(stopRoute, { id: route.id }).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function failureResult(route, state, reason) {
  if (route.state !== 'moving' && route.state !== 'cancelled') {
    return finalRoute(route);
  }

  return { ...route, state, reason };
}

function failureReason(deadline, error) {
  return deadline.aborted ? 'Route wait timed out' : String(error.message ?? error);
}

function failureState(signal, shutdown) {
  if (signal?.aborted) {
    return 'cancelled';
  }

  return shutdown.aborted ? 'interrupted' : 'failed';
}

export class WorldBrowser {
  constructor(chromium, url = 'http://localhost:5173') {
    const parsed = new URL(url);

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    ) {
      throw new Error('WORLDGL_URL must be a local HTTP URL');
    }

    this.chromium = chromium;
    this.url = url;
    this.shutdown = new AbortController();
  }
  async start() {
    this.shutdown = new AbortController();
    try {
      this.browser = await this.chromium.launch({ headless: false });
      this.page = await this.browser.newPage();
      this.page.setDefaultTimeout(10000);
      await this.page.goto(this.url);
      await this.page.waitForFunction(() => Boolean(window.world));
    } catch (error) {
      await this.close();
      throw new Error(`Could not open worldgl at ${this.url}: ${error.message}`, { cause: error });
    }
  }
  async waitForRoute(args, page, signal, timeoutMs) {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new Error('Route wait timed out')), timeoutMs);
    const deadline = timeout.signal;
    const stopped = AbortSignal.any([signal ?? new AbortController().signal, this.shutdown.signal, deadline]);
    let route = { commandIds: [], completed: 0, outcomes: [], state: 'moving' };
    // Race even page evaluation: a frozen renderer must not strand the tool.
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(stopped.reason);
      stopped.addEventListener('abort', onAbort, { once: true });

      if (stopped.aborted) {
        onAbort();
      }
    });

    try {
      const acceptance = await Promise.race([page.evaluate(worldOperation, { name: 'execute_route', args }), aborted]);

      route = { ...route, id: acceptance.id, commandIds: acceptance.commandIds };

      while (true) {
        const status = await Promise.race([
          page.evaluate(worldOperation, { name: 'navigation_status', args: {} }),
          aborted,
        ]);

        route = routeSnapshot(status, route);

        if (route.state !== 'moving') {
          return finalRoute(route);
        }

        await Promise.race([delay(100, undefined, { signal: stopped }), aborted]);
      }
    } catch (error) {
      const final = await boundedCleanup(page, route);

      return failureResult(final ?? route, failureState(signal, this.shutdown.signal), failureReason(deadline, error));
    } finally {
      clearTimeout(timer);
      stopped.removeEventListener('abort', onAbort);
    }
  }
  assertConnected(cause) {
    if (!this.browser?.isConnected() || !this.page || this.page.isClosed()) {
      throw new Error('World browser disconnected or page closed. Restart the experiment.', { cause });
    }
  }
  async call(name, args, { signal, timeoutMs = 600000 } = {}) {
    validate(name, args);
    this.assertConnected();
    try {
      signal?.throwIfAborted();
      const page = this.page;

      if (name === 'execute_route') {
        return format(await this.waitForRoute(args, page, signal, timeoutMs));
      }

      return format(await page.evaluate(worldOperation, { name, args }));
    } catch (error) {
      this.assertConnected(error);
      throw new Error(`World operation failed: ${error.message}`, { cause: error });
    }
  }
  async close() {
    this.shutdown.abort(new Error('World browser shutdown'));
    const browser = this.browser;

    this.browser = undefined;
    this.page = undefined;
    await browser?.close();
  }
}
