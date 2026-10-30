# Assignment — Trajectory Debug Panel and Top-Down Minimap

Extend the existing trajectory debugging functionality with a visible, human-operated UI.

## Requirements

**1. Trajectory debug panel**

Add a compact, collapsible panel containing:

- Start / Stop recording
- Clear trajectory history
- Toggle trajectory visibility
- Toggle destination markers
- Download recorded history as JSON
- Recording state and basic statistics (segments, samples)

Controls must use the existing `window.worldDebug.trajectory` API. Do not duplicate the recorder.

**2. Top-down minimap**

Add a small, persistent minimap in a corner of the browser.

- Fixed north-up view of the X/Z world plane
- Display the player position and heading
- Display landmarks with distinct markers
- Draw recorded trajectories and their destinations
- Preserve existing trajectory status colors
- Scale world coordinates consistently
- Update during navigation

Use a lightweight 2D canvas or SVG. A second Three.js renderer or camera is unnecessary.

**3. Usability**

- Allow showing/hiding the debug panel and minimap independently.
- Keep the main 3D scene visible and usable.
- Do not interfere with keyboard flight controls.
- Work without opening browser developer tools.

**4. Isolation**

- Keep all debugging functionality separate from the agent-facing `window.world` API.
- Do not modify the Pi extension.
- Do not expose trajectory history or debug controls to the agent.

## Constraints

Do not modify navigation behavior, flight physics or recorded data formats.

Reuse the existing recorder and visualization.

Keep the implementation minimal and focused.

Run existing tests and production build.