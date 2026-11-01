# Assignment — Minimal WebGL World Prototype

## Context

Reference project:
https://github.com/till213/WorldDomination

We want a small, understandable browser-based 3D prototype inspired by this project.

The reference uses Unity and includes procedural terrain, simple flight physics and world wrapping.

This is not a request to port the complete game.

## Goal

Build a minimal interactive 3D world running directly in a modern web browser using WebGL.

The prototype must allow a human to navigate a procedural terrain with a controllable player and provide a simple foundation for adding world objects later.

## Functional requirements

### 1. World

- Generate a procedural terrain inspired by WorldDomination.
- Prefer a simple height function based on sine waves or similar mathematics.
- Use a visible polygonal, low-poly appearance.
- Include basic lighting and distinguishable terrain colors.
- Keep terrain generation deterministic for a given seed.

### 2. Player

- Add a visible player object, initially a simple geometric shape.
- Allow movement using keyboard controls.
- Support movement in three dimensions.
- Provide a third-person camera following the player.
- Prevent the player from unintentionally disappearing below the terrain.

Exact movement controls and physics are implementation decisions.

### 3. Assets

- Support placing simple objects in the world.
- Demonstrate this with at least three objects.
- Each object must have an identifier, type, position and orientation.
- Objects should be defined through data rather than hardcoded individually into rendering logic.

Simple geometric primitives are sufficient. No external 3D models are required.

### 4. World inspection

Provide a minimal programmatic interface that allows reading the world state without depending on rendering internals.

At minimum, expose:

- Player position and orientation.
- List of world objects and their identifiers, types and positions.
- Terrain height at a given coordinate.

A small debug panel or browser console interface is sufficient to demonstrate these capabilities.

No AI integration is required.

## Technical constraints

- TypeScript preferred.
- WebGL through Three.js is acceptable.
- Vite is acceptable for development.
- No backend.
- No authentication.
- No database.
- No external services.
- No unnecessary dependencies.
- No complex architectural patterns or plugin systems.

Choose the simplest reasonable implementation.

## Deliverables

1. Working source code.
2. README with installation and execution instructions.
3. Short explanation of the project structure.
4. Description of the implemented controls.
5. Brief explanation of which concepts were reused or adapted from WorldDomination.
6. A minimal automated test for deterministic terrain generation and world-state inspection.

## Acceptance criteria

A human reviewer must be able to:

1. Run the application locally with minimal setup.
2. See a procedural polygonal terrain.
3. Move the player around the world.
4. Observe the player through a following camera.
5. See at least three objects placed in the world.
6. Inspect the player and object positions programmatically.
7. Modify the initial world objects through a simple data structure.
8. Understand the main code without studying a game engine.

## Working principles

- Inspect the reference repository before implementation.
- Reuse ideas, not unnecessary complexity.
- Make reasonable technical decisions autonomously.
- Prefer working software over elaborate architecture.
- Keep the code small and readable.
- Do not implement features outside the requested scope.
- Do not introduce abstractions solely for hypothetical future requirements.

Implement the prototype, run the available checks, and report what works and what remains incomplete.
