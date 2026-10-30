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

`npm test` passes all three automated tests; `npm run build` passes type checking and produces the production bundle. Browser appearance and keyboard interaction still need human verification in a WebGL-enabled browser. There is no browser automation test in this repository.

Deliberately omitted: physics engine, landmark collisions, world wrapping, imported models, persistence and object-editing UI. Landmarks are static visual objects; the craft can fly through them. These are not required for this minimal prototype.
