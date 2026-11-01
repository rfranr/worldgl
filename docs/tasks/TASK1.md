# Assignment — World Interaction & Navigation API

## Goal

Extend the existing WebGL prototype with a public interaction API exposed through `window.world.interact`.

The API must support both continuous manual controls and autonomous movement towards a destination.

The main requirement is that **movement continues independently of the caller**. An external client may issue a command, inspect the world later, and change or cancel the trajectory at any moment.

Do not implement an AI agent.

## Public contract

Reuse existing project types where applicable.

```ts
interface FlightControls {
  forward: number;  // -1..1
  turn: number;     // -1..1
  strafe: number;   // -1..1
  vertical: number; // -1..1
}

interface NavigationStatus {
  state: 'idle' | 'moving' | 'arrived' | 'blocked';
  target?: Vector3;
}

interface WorldInteractionAPI {
  // Continuous manual control
  setControls(controls: Partial<FlightControls>): void;
  getControls(): FlightControls;
  setControlTimeout(milliseconds: number): void;

API  // Autonomous navigation
  moveBy(displacement: {
    forward?: number;
    right?: number;
    up?: number;
  }): void;

  moveTo(position: Vector3): void;
  getNavigationStatus(): NavigationStatus;

  // Cancel movement
  stop(): void;

  // Teleportation
  setPlayerPosition(position: Vector3): void;
  setPlayerOrientation(orientation: Vector3): void;

  // World objects
  addObject(object: WorldObject): void;
  removeObject(id: string): void;
  moveObject(id: string, position: Vector3): void;

  // Simulation
  reset(): void;
}

interface WorldAPI {
  inspect(): WorldSnapshot;
  terrainHeight(x: number, z: number): number;
  interact: WorldInteractionAPI;
}
```

## Expected behavior

### 1. Continuous controls

- `setControls()` updates only the specified axes.
- Values represent control intensity, not distance.
- The existing simulation loop applies the controls continuously.
- `setControlTimeout()` defines an inactivity timeout for API controls.
- Expired controls automatically return to zero.
- Keyboard input remains functional and independent of the API timeout.

### 2. Autonomous navigation

- `moveBy()` moves relative to the player's orientation when the command is issued.
- `moveTo()` moves towards an absolute world position.
- Both methods return immediately.
- Movement progresses over simulation frames, not through instantaneous position changes.
- Movement must have a finite speed and use the existing movement model where practical.
- The player must not pass below the terrain.
- Navigation must not block rendering or browser interaction.
- A new navigation command replaces the previous destination.
- `getNavigationStatus()` reports progress.
- Arrival must use a reasonable positional tolerance to avoid oscillation.
- If a destination cannot be reached, navigation must terminate with `blocked` rather than remain active forever.

Keep navigation simple. Sophisticated pathfinding and obstacle avoidance are out of scope.

### 3. Command precedence

Only one movement mode may control the player at a time.

- `moveBy()` and `moveTo()` cancel active API manual controls.
- `setControls()` cancels autonomous navigation.
- `stop()` cancels both modes immediately.
- Teleportation cancels active movement.
- Keyboard input takes precedence while the human is actively controlling the player.

Document the chosen keyboard handover behavior.

### 4. World manipulation

- Object operations update both simulation state and Three.js representation.
- `inspect()` reflects all mutations.
- Reject duplicate IDs, unknown object types and invalid coordinates.
- `reset()` restores the initial world and cancels all active movement.

### 5. Safety and validation

- Reject NaN, Infinity and invalid numeric values.
- Validate control ranges and timeout values.
- Prevent navigation outside supported world boundaries.
- Ensure movement cannot become permanently stuck in an active state.
- Do not expose mutable internal state through the public API.

## Acceptance scenarios

All examples must work from the browser console.

**A. Move forward 10 world units**

```js
world.interact.moveBy({ forward: 10 });
```

The player moves progressively and eventually stops.

**B. Inspect movement**

```js
world.inspect();
world.interact.getNavigationStatus();
```

Position and navigation status reflect the current simulation state.

**C. Change destination while moving**

```js
world.interact.moveTo({ x: 20, y: 15, z: -20 });
world.interact.moveTo({ x: -10, y: 12, z: 30 });
```

The second command replaces the first without waiting.

**D. Take manual control**

```js
world.interact.setControls({ forward: 1, turn: 0.5 });
world.interact.setControls({ turn: -0.5 });
world.interact.stop();
```

The player changes trajectory continuously and stops when requested.

**E. Automatic control timeout**

```js
world.interact.setControlTimeout(2000);
world.interact.setControls({ forward: 1 });
```

After two seconds without refreshing API controls, the controls return to zero. Autonomous navigation is not affected by this timeout.

**F. Manipulate objects**

```js
world.interact.addObject({
  id: 'test-rock',
  type: 'rock',
  position: { x: 10, y: 5, z: 10 },
  orientation: { x: 0, y: 0, z: 0 }
});

world.interact.moveObject('test-rock', {
  x: 20, y: 5, z: 20
});

world.interact.removeObject('test-rock');
```

Visual representation and inspection results must remain consistent.

## Deliverables

- Working implementation.
- Focused automated tests for navigation, interruption, timeout, validation and world mutations.
- Updated README documenting the API and console examples.
- Brief implementation summary and test results.

## Engineering guidelines

- Inspect the existing implementation before making changes.
- Extend the current architecture rather than rewriting it.
- Keep simulation logic independent of Three.js.
- Reuse existing movement behavior where practical.
- No backend, external services, AI integration or new architectural frameworks.
- Prefer the simplest implementation that satisfies the contract.
- Make reasonable technical decisions autonomously.

**Do not overengineer. This is still a small experimental prototype.**
