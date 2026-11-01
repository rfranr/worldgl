# Validation and evidence

[Documentation home](../README.md)

## Executed for this documentation review

`npm run check:report` completed successfully using the existing environment;
no packages or browsers were installed for this review.

| Check | Observed result |
| --- | --- |
| ESLint | Passed; no diagnostics |
| Core/data/browser tests | 45 passed, 0 failed |
| Explorer adapter tests | 21 passed, 0 failed |
| TypeScript and Vite build | Passed; both browser pages built |
| Cognitive complexity | Total 273, maximum 5, 0 violations |
| Dependency validation | No violations; no reported cycles |
| First-party structure | Maximum dependency depth 8 |

These are observations of this checkout, not permanent guarantees. Documentation-only changes do not change the source metrics. The adapter's earlier [quality report](../experiments/pi-explorer/QUALITY.md) records historical values (262 total complexity and 39 core tests), not a current baseline regression.

The structure report identifies `src/main.ts` as an integration point (fan-out 6, 14 transitive dependencies, depth 8); `src/world.ts` has fan-out 4, six transitive dependencies and depth 5. This is a useful review boundary for renderer versus simulation dependencies. No new modules, indirection or shared state were introduced here. Passing dependency rules alone is not a proof of ideal architecture.

## What the tests establish

- Deterministic terrain and shared triangle interpolation, detached snapshots, movement bounds and reset.
- Control expiry, keyboard handover, orientation and perception boundaries.
- Queue ordering, abort, route validation and terminal waypoint outcomes.
- Opt-in trajectory sampling, retention, status events and export isolation.
- Local artifact validation, partial JSONL handling and unavailable measurements.
- Real Chromium HUD-to-inspector interaction, file import, segment selection and multi-run comparison/pinning.
- Adapter validation, dispatch, route waiting, export behavior and quality-check coverage.

These automated checks do not replace human visual inspection across browsers or establish successful model behavior. No headed smoke run or model-provider request was performed during this documentation review.

## Implemented versus experimental

The [reference](reference.md), [comparison workflow](inspector.md) and [navigation semantics](../experiments/pi-explorer/NAVIGATION.md) describe implemented interfaces. The optional adapter can connect Pi to the browser and capture artifacts; its tool restrictions are not an OS security sandbox.

Existing export archives are artifacts, not by themselves evaluated results. This review did not score their contents or infer model success from their presence. Prior adapter smoke/RPC observations are retained as historical reports in its README, with scope explicitly limited to those checks.

## Future hypotheses, not findings

Structured perception might support landmark discovery; queued routes might reduce model interaction overhead; evidence comparison might help explain divergent navigation choices. None of these claims has been established here. Testing them requires recorded missions, seed/model/configuration provenance, defined success criteria and repeated runs. Session statements alone cannot establish causes.

A proposed [engineering journal structure](journal-plan.md) separates questions, interventions, observations and interpretation. No experiment results or journal entries are invented as part of this review.
