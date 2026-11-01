# Simulation and debugging reference

[Documentation home](../README.md) · [Inspector workflow](inspector.md) · [Validation](validation.md)

Commands below run from the repository root.

A minimal, local-only Three.js + TypeScript flight prototype. Includes deterministic low-poly terrain, a visible geometric craft, three data-defined landmarks, a following camera, and live telemetry. No backend or runtime network services.

## Experiment inspector

Open `inspector.html` (also linked from the simulation) to inspect local, extracted experiment directories or individual files. Nested JSON/JSONL artifacts are processed entirely in the browser, with a 20 MiB per-file limit. The production build includes both pages and supports static hosting, including subdirectories. Deploy only `dist/`, never the repository root.

Pi JSONL session entries and JSON objects containing `entries` are supported. Messages, tool arguments, results, and execution errors are displayed as escaped text in session log order, including branches. WorldGL v1 trajectories reuse the existing XZ map; select a segment to view its samples, command, destination, and outcome. Summary distance is sampled 3D length within segments; duration is the retained sample span, not total experiment wall time. Empty recordings have unknown duration.

Existing exports do not share tool-call identifiers or a synchronized simulation clock. Selecting a call therefore reports its trajectory association as **unknown**; command order or matching arguments are not treated as reliable evidence. Select trajectory segments independently. Multiple runs are displayed as separate artifacts, not merged. Missing files are allowed; malformed JSONL lines are reported and skipped, invalid trajectories are rejected. Archives and HTML session exports are unsupported. No imported content executes or touches the live world. Vite blocks access to `experiments/`; artifacts are not bundled.

## Run

Requires Node.js 20.19+ or 22.12+ and a modern WebGL-capable browser.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints (normally http://localhost:5173).

```sh
npm test           # simulation/data tests + Chromium interaction regression
npm run build      # TypeScript checks + production bundle
npm run preview    # serve the production build locally
```

The browser regression uses the root project's Playwright dev dependency, installed by `npm ci`. Provision Chromium explicitly with `npx playwright install chromium` before running the full suite (including in CI). The test does not install dependencies or browsers and does not depend on the experiment workspace. It performs real hit-tested clicks from the live HUD into the inspector, opens the native file chooser, imports a trajectory, and selects a segment.

## Trajectory debugging (browser only)

Recording is off by default and is exposed **only** through `window.worldDebug`, never through agent tools.

Use the bottom-right **Trajectory recorder** panel without opening developer tools: start/stop, clear, show/hide paths or destination markers, and download JSON. The panel shows recording state and segment/sample counts. Click its heading to collapse it; the **Debug panel** and **Minimap** checkboxes independently hide either view and remain available to restore them. Focusing a debug control releases held keyboard flight keys; click back into the scene to resume keyboard flight.

The persistent canvas minimap is fixed north-up (−Z at the top, +X to the right), spanning the full 240 × 240 world. Its white arrow shows player position/heading; circles, squares and diamonds identify beacons, rocks and towers. Paths and destination outlines use the same status colors and visibility settings as the 3D overlay. It updates during navigation, including while recording is stopped. Debug UI and history are not exposed to agent tools.

In the browser console:

```js
const trajectory = window.worldDebug.trajectory;
trajectory.start();
// Navigate with the existing Pi agent or keyboard.
trajectory.stop();
trajectory.getHistory(); // detached, JSON-serializable snapshot
trajectory.getState(); // recording, visible, destinationsVisible
trajectory.setVisible(false); // true to show again; does not stop recording
trajectory.setDestinationsVisible(false); // true to show destination diamonds
trajectory.clear(); // history/overlay only; does not reset the world
```

Lines/destination diamonds are blue while active, green when completed, amber when interrupted (including recording stopped), and red when blocked. Successive commands remain separate, even for identical destinations. Recording can start during an existing trip; its earlier command arguments are then unavailable, but the current destination is captured.

Samples contain simulation timestamps in seconds, absolute XYZ positions and Euler orientations in radians (Y up). Sampling is every 0.1 simulation seconds, plus segment boundaries; simulation time advances only with world updates, not wall time. Each segment stores its command/arguments, destination, outcome and timestamped status events including `arrived` and `blocked`. History retains the newest 64 segments and newest 1,000 samples per segment; older data is discarded. `startedAt` is an ISO wall-clock timestamp for the history. The versioned JSON has no Three.js dependencies.

Download JSON from the console:

```js
const url = URL.createObjectURL(new Blob([trajectory.exportJSON()], { type: 'application/json' }));
const link = document.createElement('a');
link.href = url;
link.download = 'trajectory.json';
link.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

## Controls

- **W / S**: fly forward / backward relative to heading
- **A / D**: turn left / right
- **Q / E**: strafe left / right
- **Space / Shift**: rise / descend
- **R**: reset craft and camera

Flight is direct velocity control, not a rigid-body simulation. The craft maintains at least 1.5 units of terrain clearance; horizontal movement stops at world boundaries and altitude is capped at 65. Losing focus clears held keys. The camera follows behind and avoids going under the terrain. Keyboard controls target desktop browsers.

## Inspect the world

Open browser developer tools:

```js
window.world.inspect()                 // detached snapshot: seed, player, objects
window.world.inspect().player.position // { x, y, z }
window.world.inspect().player.orientation // Euler radians
window.world.inspect().objects         // id, type, position, orientation
window.world.terrainHeight(10, -20)     // exact triangulated surface height
```

Perception (`observe()` / `inspect_world`) filters object centers by 3D distance (maximum 60 units), horizontal FOV (90°), and vertical FOV (90°), with inclusive boundaries and no occlusion. Orientation Y is yaw; orientation X is pitch in radians (positive looks up). `lookAt` sets pitch immediately while yaw turns at the existing rate. Navigation and movement remain yaw-based; roll does not affect perception.

The browser's `window.world.inspect()` exposes perception-filtered objects; the internal simulation's `inspect()` and top-right telemetry use the full snapshot. Snapshots can be modified without changing the simulation. Coordinates use Y up; heading zero faces negative Z. Terrain queries are defined outside the visible map as well, but the craft stays within it.

## Interaction API

Commands return immediately; the render loop advances movement. Console examples:

```js
world.interact.moveBy({ forward: 10 }); // relative to heading at issue time
world.interact.getNavigationStatus(); // idle | moving | arrived | blocked | failed, plus queue/route status
world.interact.moveTo({ x: 20, y: 15, z: -20 });
world.interact.moveTo({ x: -10, y: 12, z: 30 }); // replaces destination
world.interact.turnBy({ radians: Math.PI / 2 }); // asynchronous heading change
world.interact.lookAt({ x: 20, y: 15, z: -20 }); // pitch immediately; yaw progressively
world.interact.setControlTimeout(2000);
world.interact.setControls({ forward: 1, turn: 0.5 });
world.interact.setControls({ turn: -0.5 }); // retains forward
world.interact.getControls();
world.interact.stop();
world.interact.setPlayerPosition({ x: 0, y: 20, z: 12 });
world.interact.setPlayerOrientation({ x: 0, y: Math.PI / 2, z: 0 });
world.interact.addObject({
  id: 'test-rock', type: 'rock', position: { x: 10, y: 5, z: 10 },
  orientation: { x: 0, y: 0, z: 0 }
});
world.interact.moveObject('test-rock', { x: 20, y: 5, z: 20 });
world.interact.removeObject('test-rock');
world.interact.reset();
```

Controls are intensities in [-1, 1]: `forward`, `turn`, `strafe`, `vertical`.
Unspecified axes are retained. The default inactivity timeout is 2000 wall-clock
milliseconds; any control update refreshes all axes. Timeout accepts finite
nonnegative milliseconds (zero expires immediately), and does not affect navigation.

Navigation clears manual controls; manual commands cancel navigation. Stop and
teleportation cancel both. **Any held movement key cancels API movement**, even
opposing keys: releasing the keyboard never resumes a stale command. Reset also
restores initial objects. Object meshes synchronize on the next rendered frame,
including disposal of removed resources; inspection reflects mutations immediately.

Navigation follows a straight line at 12 units/second with 0.15-unit arrival
tolerance, terrain clearance of 1.5, and no obstacle avoidance. Unreachable ground
targets become blocked; five simulation seconds without meaningful progress also blocks movement. Cumulative progress can continue beyond 30 seconds. Queues and routes share these constraints; see [queue and route semantics](../experiments/pi-explorer/NAVIGATION.md).
Positions require X/Z within [-118, 118] and Y within [-65, 65]. Teleports clamp
upward to terrain clearance. All coordinates must be finite; invalid commands,
duplicate IDs, unsupported types and missing object IDs throw. Returned snapshots,
controls and status are detached copies. Angles are radians; only yaw controls
flight heading. The simulation pauses with rendering in background tabs, but manual
controls expire by wall-clock time before the next movement frame.

## Structure and editing

- `src/world.ts`: terrain math, initial object data, world assembly and inspection; no rendering dependencies.
- `src/flight.ts`, `src/navigation.ts`, `src/navigation-motion.ts`, `src/world-interactions.ts`: movement, queue/route execution and mutation APIs.
- `src/perception.ts`, `src/perception-view.ts`: observation filtering and optional visual field-of-view overlay.
- `src/trajectory*.ts`: recording, overlays, minimap and debug controls.
- `src/inspector*.ts`, `src/comparison*.ts`: local artifact parsing, inspection and comparison.
- `src/main.ts`: terrain mesh, primitive factories, lights, craft, camera, input and telemetry.
- `src/style.css`: compact overlay styling.
- `tests/world.test.ts`: deterministic terrain, triangle interpolation, inspection isolation, flight safety and reset.

Edit `INITIAL_OBJECTS` in `src/world.ts` to place landmarks. Every entry has a unique ID, a supported type (`beacon`, `rock`, `tower`), position and Euler orientation. The provided initial data sets each object's Y to the terrain height at its X/Z. For a new primitive type, add its geometry factory in `src/main.ts` and extend the type union. Rendering iterates the data rather than individually placing landmarks.

Terrain is a seeded sum/product of sine waves sampled on a four-unit grid. Both mesh triangles and height queries share those samples and the same diagonal, so flight clearance matches the visible facets. Triangle colors depend on elevation; flat normals and basic hemisphere/directional lighting emphasize the polygons.

## Reference and adaptations

Inspected [WorldDomination](https://github.com/till213/WorldDomination), especially `Assets/Scripts/TerrainFunction.cs` and `PlayerController.cs`, before implementation. Its terrain combines weighted sine contours, interpolates elevations, and colors tiles by elevation. This prototype adapts the sine-based height and elevation-palette ideas with simpler seeded phases and direct triangle interpolation rather than the Unity contour-patch system. Its thrust-controlled flight inspired the navigable third-person craft, but controls here use keyboard velocity rather than mouse-directed rigid-body forces. The reference wraps player coordinates; this version intentionally uses bounded edges for a simpler camera and world model. No Unity code/assets were copied.

## Validation and limitations

See [validation and evidence](validation.md) for the current executed checks. Browser automation covers inspector and comparison interaction; it is not a comprehensive visual or keyboard-flight review.

Deliberately omitted: physics engine, landmark collisions, world wrapping, imported models, persistence and object-editing UI. Landmarks are API-editable visual objects; the craft can fly through them. These are not required for this minimal prototype.
