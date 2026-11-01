# Assignment — Export Explorer Experiment

## Goal

Export a complete, self-contained record of each Pi explorer run for offline analysis and comparison.

## Requirements

- Capture the original user prompt.
- Preserve the native Pi session, including tool calls and responses.
- Record model identification and available token/cost usage.
- Export the existing worldgl trajectory history.
- Generate a manifest containing world seed, Git commit, timestamps and experiment configuration.
- Calculate basic navigation and tool usage metrics.
- Save all artifacts in a uniquely named experiment directory.

## Constraints

- Implement this in `experiments/pi-explorer/`.
- Reuse Pi's native session and usage data where available.
- Reuse `window.worldDebug.trajectory`; do not duplicate recording.
- Do not change the agent's tools, permissions, navigation or prompts.
- Never expose experiment telemetry to the agent.
- Do not export authentication credentials, environment secrets or unrelated local files.
- Prefer a simple export command over a new service or framework.

## Acceptance

A completed exploration can be exported into one directory containing its prompt, Pi session, trajectory, manifest and metrics.

The export must also work for interrupted runs, marking incomplete data appropriately.

Document how to export and inspect an experiment.