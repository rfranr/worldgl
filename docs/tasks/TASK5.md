# Assignment — Flight Trajectory Recorder

## Goal

Add a minimal trajectory recording and visualization capability to worldgl.

We want to investigate how an AI agent navigates the world, comparing issued commands with actual player movement.

Do not change existing flight physics, navigation behavior or Pi agent tools.

## Requirements

### Recording

- Record player position, orientation and simulation time during movement.
- Use periodic sampling rather than recording every rendering frame.
- Record navigation commands and status transitions, including `arrived` and `blocked`.
- Preserve separate trajectories for successive navigation commands.
- Keep a bounded history to avoid unbounded memory growth.

### Visualization

- Draw the recorded trajectory as a visible line in the Three.js scene.
- Allow showing and hiding the trajectory.
- Distinguish completed, interrupted and blocked navigation segments.
- Display command destinations as optional markers.
- Keep the visualization independent of the movement logic.

### Inspection

Expose a small API:

```ts
interface TrajectoryAPI {
  start(): void;
  stop(): void;
  clear(): void;
  getHistory(): TrajectoryHistory;
  setVisible(visible: boolean): void;
}
```

Available through:

```js
window.world.trajectory
```

`getHistory()` must return serializable data, including timestamps, sampled positions and navigation events.

### Export

Support exporting trajectory history as JSON for offline analysis.

The exported data must contain enough information to reconstruct the trajectory without requiring Three.js.

### Acceptance criteria

1. Start recording from the browser console.
2. Navigate using the existing Pi agent.
3. Observe the resulting trajectory in the 3D world.
4. Identify destinations and navigation interruptions.
5. Retrieve and export recorded data.
6. Clear the trajectory without resetting the world.
7. Existing movement and agent tools continue working unchanged.

Add focused automated tests for recording, sampling, history limits and export consistency.

## Constraints

- No changes to navigation algorithms or flight physics.
- No backend or external services.
- No new architectural frameworks.
- Keep implementation small and understandable.
- Prefer existing Three.js capabilities.
- Expose trajectory recording and visualization exclusively through window.worldDebug, not window.world. Do not modify the Pi extension or expose any trajectory tools to the agent.

Document how to enable recording and inspect the results.
