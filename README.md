# WorldGL — Field flight

A minimal, local-only Three.js + TypeScript flight prototype. Includes deterministic low-poly terrain, a visible geometric craft, three data-defined landmarks, a following camera, and live telemetry. No backend or runtime network services.

## Run

Requires Node.js 20.19+ or 22.12+ and a modern WebGL-capable browser.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints (normally http://localhost:5173).

```sh
npm test           # pure simulation tests, no browser required
npm run build      # TypeScript checks + production bundle
npm run preview    # serve the production build locally
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

The top-right panel demonstrates this same API. Snapshots can be modified without changing the simulation. Coordinates use Y up; heading zero faces negative Z. Terrain queries are defined outside the visible map as well, but the craft stays within it.

## Interaction API

Commands return immediately; the render loop advances movement. Console examples:

```js
world.interact.moveBy({ forward: 10 }); // relative to heading at issue time
world.interact.getNavigationStatus(); // idle | moving | arrived | blocked, plus target
world.interact.moveTo({ x: 20, y: 15, z: -20 });
world.interact.moveTo({ x: -10, y: 12, z: 30 }); // replaces destination
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
targets become blocked; a 30-second simulation-time limit guarantees termination.
Positions require X/Z within [-118, 118] and Y within [-65, 65]. Teleports clamp
upward to terrain clearance. All coordinates must be finite; invalid commands,
duplicate IDs, unsupported types and missing object IDs throw. Returned snapshots,
controls and status are detached copies. Angles are radians; only yaw controls
flight heading. The simulation pauses with rendering in background tabs, but manual
controls expire by wall-clock time before the next movement frame.

## Structure and editing

- `src/world.ts`: terrain math, initial object data, movement, inspection; no rendering dependencies.
- `src/main.ts`: terrain mesh, primitive factories, lights, craft, camera, input and telemetry.
- `src/style.css`: compact overlay styling.
- `tests/world.test.ts`: deterministic terrain, triangle interpolation, inspection isolation, flight safety and reset.

Edit `INITIAL_OBJECTS` in `src/world.ts` to place landmarks. Every entry has a unique ID, a supported type (`beacon`, `rock`, `tower`), position and Euler orientation. The provided initial data sets each object's Y to the terrain height at its X/Z. For a new primitive type, add its geometry factory in `src/main.ts` and extend the type union. Rendering iterates the data rather than individually placing landmarks.

Terrain is a seeded sum/product of sine waves sampled on a four-unit grid. Both mesh triangles and height queries share those samples and the same diagonal, so flight clearance matches the visible facets. Triangle colors depend on elevation; flat normals and basic hemisphere/directional lighting emphasize the polygons.

## Reference and adaptations

Inspected [WorldDomination](https://github.com/till213/WorldDomination), especially `Assets/Scripts/TerrainFunction.cs` and `PlayerController.cs`, before implementation. Its terrain combines weighted sine contours, interpolates elevations, and colors tiles by elevation. This prototype adapts the sine-based height and elevation-palette ideas with simpler seeded phases and direct triangle interpolation rather than the Unity contour-patch system. Its thrust-controlled flight inspired the navigable third-person craft, but controls here use keyboard velocity rather than mouse-directed rigid-body forces. The reference wraps player coordinates; this version intentionally uses bounded edges for a simpler camera and world model. No Unity code/assets were copied.

## Validation and limitations

`npm test` passes all six automated tests; `npm run build` passes type checking and produces the production bundle. Browser appearance and keyboard interaction still need human verification in a WebGL-enabled browser. There is no browser automation test in this repository.

Deliberately omitted: physics engine, landmark collisions, world wrapping, imported models, persistence and object-editing UI. Landmarks are API-editable visual objects; the craft can fly through them. These are not required for this minimal prototype.
