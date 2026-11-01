## Visual perception cone overlay (Minimap & Main Render)

**Goal:** Add a toggleable visual representation of the agent's 3D perception cone in both the 2D minimap and the main scene renderer for debugging and visualization purposes.

### Requirements

1. **Configuration & Toggle State:**
   - Add a UI control / toggle switch (and/or keyboard shortcut) to enable or disable the perception cone visualization.
   - The toggle state must control visibility on both the minimap and the main render simultaneously.

2. **Minimap Visualization (2D):**
   - Render the horizontal projection of the perception cone on the minimap as a semi-transparent arc/sector originating from the player's position.
   - Update the cone orientation and radius dynamically with player movement, horizontal FOV, and maximum perception range.

3. **Main Render Visualization (3D):**
   - Render the 3D perception cone (or frustum wireframe) in the main viewport representing both horizontal and vertical FOV angles and maximum range.
   - Use a non-intrusive rendering style (e.g., semi-transparent mesh with low alpha or wireframe outline) so it doesn't obstruct scene objects.

4. **Architecture & Scope:**
   - Keep the visualization layer purely visual—do not alter the underlying simulation state or the read-only perception API math.
   - Reuse existing UI/minimap and render pipeline conventions in the codebase.

### Tests / Verification

- Toggling the option correctly shows/hides the visual cone in both views.
- The visual cone updates smoothly in real-time when the player moves, rotates (yaw), or pitches (vertical look).
- Objects inside the visual cone boundaries strictly match the objects returned by the perception API.

### Acceptance criteria

The user can toggle the visual perception cone on/off, seeing a clear, non-intrusive representation of the agent's FOV on both the minimap and the main display without affecting performance or core simulation logic.