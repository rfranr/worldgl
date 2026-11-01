## Agent perception: extend 2D FOV to a 3D perception cone

**Goal:** Extend the existing horizontal field of view filtering into a full 3D perception cone by incorporating vertical angle constraints (pitch / vertical FOV).

### Requirements

1. Retain the existing horizontal FOV and maximum distance logic, extending it to evaluate 3D coordinates $(x, y, z)$.
2. The perception API in `src/` must now check visibility against a **3D cone**:
   - Player 3D position.
   - Player orientation (yaw/heading and pitch/elevation).
   - Horizontal and vertical fields of view (or a radial cone opening angle).
   - Maximum observation distance.
3. Ensure `look_at` and orientation updates naturally account for vertical angles (pitch) if applicable, updating `inspect_world` outputs accordingly.
4. Objects above or below the vertical cone boundaries must be filtered out, even if within distance and horizontal alignment.
5. Keep navigation, collision, and existing data structures unchanged.

### Scope

- Focus strictly on extending the geometric filtering from 2D to 3D cone calculations.
- Do not implement occlusion/raycasting, memory, or fog of war.
- Define reasonable defaults for vertical FOV (or cone angle) and document them.

### Tests

Cover at least:

- Object inside both horizontal and vertical bounds: visible.
- Object within horizontal angle but too high/low vertically: invisible.
- Changing pitch/looking up or down updates visible objects correctly.
- Retain existing distance and horizontal FOV tests.

### Acceptance criteria

The visibility filter operates as a true 3D cone, filtering objects based on distance, horizontal angle, and vertical angle.

**Reuse existing coordinate, vector, and orientation abstractions already present in the codebase. Keep changes clean and focused on extending the FOV math.**