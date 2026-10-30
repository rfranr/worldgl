export const names = ['inspect_world', 'move_by', 'move_to', 'navigation_status', 'stop_movement', 'turn_by', 'look_at'];

export function validate(name, args) {
  if (!names.includes(name)) throw new Error('Unknown world tool');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Expected an argument object');
  const keys = name === 'move_by' ? ['forward', 'right', 'up'] : ['move_to', 'look_at'].includes(name) ? ['x', 'y', 'z'] : name === 'turn_by' ? ['radians'] : [];
  for (const [key, value] of Object.entries(args)) {
    if (!keys.includes(key)) throw new Error(`Unknown argument: ${key}`);
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be finite`);
  }
  if (['move_to', 'look_at', 'turn_by'].includes(name) && keys.some(key => !(key in args))) throw new Error(`${name} requires ${keys.join(', ')}`);
  if (name === 'move_to' && (Math.abs(args.x) > 118 || Math.abs(args.z) > 118 || Math.abs(args.y) > 65)) throw new Error('Destination outside world bounds');
}

// This fixed function is the only JavaScript the tools can execute in the page.
export function worldOperation({ name, args }) {
  const world = window.world;
  if (!world) throw new Error('world API unavailable; check the worldgl page');
  switch (name) {
    case 'inspect_world': return world.inspect();
    case 'move_by': world.interact.moveBy(args); return { accepted: true };
    case 'move_to': world.interact.moveTo(args); return { accepted: true };
    case 'turn_by': world.interact.turnBy(args); return { accepted: true };
    case 'look_at': world.interact.lookAt(args); return { accepted: true };
    case 'navigation_status': return world.interact.getNavigationStatus();
    case 'stop_movement': world.interact.stop(); return { stopped: true };
    default: throw new Error('Unknown world tool');
  }
}

export function format(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], details: data };
}

export class WorldBrowser {
  constructor(chromium, url = 'http://localhost:5173') {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('WORLDGL_URL must be a local HTTP URL');
    this.chromium = chromium;
    this.url = url;
  }
  async start() {
    try {
      this.browser = await this.chromium.launch({ headless: false });
      this.page = await this.browser.newPage();
      this.page.setDefaultTimeout(10000);
      await this.page.goto(this.url);
      await this.page.waitForFunction(() => Boolean(window.world));
    } catch (error) {
      await this.close();
      throw new Error(`Could not open worldgl at ${this.url}: ${error.message}`);
    }
  }
  async call(name, args) {
    validate(name, args);
    if (!this.browser?.isConnected() || !this.page || this.page.isClosed()) throw new Error('World browser disconnected or page closed. Restart the experiment.');
    try {
      return format(await this.page.evaluate(worldOperation, { name, args }));
    } catch (error) {
      if (!this.browser.isConnected() || this.page.isClosed()) throw new Error('World browser disconnected or page closed. Restart the experiment.');
      throw new Error(`World operation failed: ${error.message}`);
    }
  }
  async close() {
    const browser = this.browser;
    this.browser = undefined;
    this.page = undefined;
    await browser?.close();
  }
}
