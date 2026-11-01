# Assignment — Improve Flight Navigation and Agent Controls

## Goal

Improve the existing worldgl navigation so the player behaves like a flying vehicle rather than a translating object.

Extend the Pi explorer tools to support orientation control.

## Requirements

### 1. Smooth flight orientation

- `moveTo()` must progressively orient the player towards its destination.
- Respect a finite angular velocity.
- Avoid instantaneous rotations.
- Preserve existing terrain clearance and navigation status behavior.
- Keep navigation non-blocking and interruptible.
- Do not introduce complex flight physics or pathfinding.

### 2. Agent orientation tools

Expose two additional Pi tools:

- `turn_by({ radians })`: rotate the player by a relative angle, progressively.
- `look_at({ x, y, z })`: progressively orient the player towards a world position.

Both commands must return immediately while the simulation performs the rotation.

A new orientation command must replace any previous rotation command.

`stop_movement` must also cancel active rotations.

### 3. Control consistency

- Preserve existing keyboard controls.
- Avoid conflicts between manual controls, autonomous navigation and orientation commands.
- Keep `window.world` as the public interface used by the Pi extension.
- Do not manipulate Three.js meshes directly from the extension.

### 4. Acceptance criteria

- The player visibly turns when navigating to a destination.
- `turn_by({ radians: Math.PI / 2 })` rotates the player approximately 90 degrees.
- `look_at()` points the player towards the requested location.
- Rotations can be interrupted or replaced.
- Existing movement and inspection tools continue working.
- Automated tests cover rotation, interruption and navigation compatibility.

## Constraints

Extend the existing implementation. Keep the changes small, readable and focused.

Do not redesign the simulation, introduce new frameworks or implement advanced flight physics.

Run the tests and report the results.
