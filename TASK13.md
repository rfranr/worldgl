## Agent perception: field of view

**Goal:** Replace the agent's omniscient world inspection with observation limited by its current position and orientation.

### Requirements

1. The simulation must retain complete knowledge of the world. Do not modify or remove objects from the world state.
2. Introduce a read-only perception API in `src/` that returns only objects visible to the player.
3. Visibility must depend on:
   - Player position.
   - Player orientation (horizontal field of view).
   - Maximum observation distance.
4. Update `inspect_world` in `experiments/pi-explorer/` to use this perception API instead of returning every object.
5. `turn_by`, `look_at` and player movement must naturally affect subsequent observations without needing changes to their public interfaces.
6. Objects outside the field of view must not be returned, even if previously observed.
7. Keep the existing navigation, collision and movement behavior unchanged.

### Scope

- Implement geometric field-of-view filtering first.
- Do not implement terrain occlusion, vertical field of view, memory, fog of war or new agent tools in this assignment.
- Preserve the existing object data format wherever possible.
- Choose reasonable field-of-view and distance defaults, and document them.
- Keep the complete world state accessible internally, but not through the agent-facing `inspect_world` API.

### Tests

Cover at least:

- Object directly ahead: visible.
- Object behind the player: invisible.
- Object outside maximum range: invisible.
- Rotating changes which objects are visible.
- Moving changes which objects are visible.
- Inspection has no side effects.
- Existing navigation behavior remains unchanged.

### Acceptance criteria

An agent must be able to discover previously unseen objects by turning or moving, without being given the full world state.

**First inspect the existing architecture and reuse its coordinate and orientation conventions. Avoid unnecessary abstractions or unrelated refactoring.**
