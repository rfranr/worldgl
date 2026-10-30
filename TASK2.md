# Assignment — Fix Autonomous Navigation Progress Detection

Repository: https://github.com/rfranr/worldgl

## Context

The current autonomous navigation implementation in `src/world.ts` uses a fixed 30-second timeout to mark navigation as `blocked`.

This can incorrectly report a blocked movement even when the player is making progress towards the destination.

## Goal

Replace the fixed navigation timeout with progress-based blocking detection.

## Requirements

1. Navigation must not become `blocked` solely because a fixed amount of time has elapsed.
2. Detect when the player is no longer making meaningful progress towards the destination.
3. Reset the inactivity timer when meaningful progress is detected.
4. Mark navigation as `arrived` when the destination is reached within the existing tolerance.
5. Mark navigation as `blocked` when the destination cannot be reached, including targets below the minimum terrain clearance.
6. A new navigation command must reset progress tracking.
7. `stop()`, manual controls and teleportation must preserve their existing cancellation behavior.
8. Preserve the existing public `window.world.interact` API.

## Acceptance criteria

- A reachable destination taking longer than 30 seconds must not be marked `blocked` while progress continues.
- An unreachable destination must eventually become `blocked`.
- Navigation must never remain indefinitely in `moving` without making progress.
- A new `moveTo()` command must replace the previous destination correctly.
- Existing keyboard controls and world inspection must continue working.

Add focused automated tests covering these scenarios, preferably using deterministic simulation time.

## Scope

- Fix navigation progress detection.
- Do not redesign the movement physics.
- Do not introduce pathfinding or obstacle avoidance.
- Do not refactor unrelated code.
- Keep the implementation simple and understandable.

Run the existing tests and report the results.
