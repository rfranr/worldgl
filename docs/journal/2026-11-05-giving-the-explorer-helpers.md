# Giving the Explorer Helpers Is Not Enough

November 5, 2026

[Engineering journal](README.md)

## What I wanted to try

In the [previous experiment](2026-11-04-giving-an-explorer-paper-and-pencil.md), I gave the explorer a workspace and programming tools. The idea was to let it calculate routes instead of doing all the geometry in its conversation.

This time I tried making that support more concrete: explain movement failures, strengthen the execution instructions, and provide reusable workspace helpers. The model would still choose its route and decide whether and how to recover. The helpers would handle calculations and evidence, not take over navigation.

The mission was to physically circle every known landmark, then fly a larger loop enclosing the group. It was not enough to describe a plausible route.

## What happened

The approach is not working yet. The model does not use the workspace helpers, and it claims completion without completing the flight.

One useful failure is export `2026-11-05T07-07-34.589Z-9ef7d65b-3d2b-42a2-8dfd-5afb072f7ec5`. Its recorded model is `ollama/qwen3:1.7b`, not a 34B model. The session exposed `read`, `write`, and `bash`, and included the stronger instruction to execute calculations and verify observed movement. It made no calls to any of those programming tools.

Instead, it submitted landmark positions directly as flight destinations. The rock's target altitude was about 8.30, while the tool reported a minimum of 9.80. The route stopped correctly with `destination_below_clearance`. The model attributed that failure to the tower, even though the tower waypoint had been cancelled.

The next attempt repeated the height mistake at the tower. The model proposed approaching from another direction rather than changing the invalid destination height. The cause was available in the tool result, but it did not become a useful planning constraint.

Its proposed tower loop was wrong too: a diamond centered at `(10, -42)` around a tower at `(8, -42)`. The tower lay on a vertex instead of inside an orbit. None of that loop executed because its first waypoint blocked.

At the end, `navigation_status` reported that the latest short forward movement had arrived. The same response showed the retained route was blocked, with zero completed waypoints. The model nevertheless announced that all key locations had been visited.

The trajectory contradicts that claim. The craft travelled approximately 40 units, stayed at an altitude of 12.08, and remained between Z = 1.81 and Z = 12. The observed landmarks were at Z = -20, -12, and -42. No required loop was completed.

## The helpers I added

Based on those errors, I added local workspace scripts:

- `orbit.mjs` generates a circle around the actual landmark center and requires an explicit flight altitude.
- `orbit-cli.mjs` makes planning, status summarization, and verification executable through Node.js.
- The status summary keeps individual movement state separate from route state. An arrived command does not imply a successful mission.
- The verifier checks supplied positions for angular coverage, closure, radial distance, and altitude consistency. Planned waypoints are not execution evidence.
- `ORBIT.md`, an example input, and regression tests explain and exercise the workflow.

These helpers do not access the browser, execute movement, select recovery actions, or certify terrain feasibility. The intended cycle remains: calculate with a script, inspect its output, submit waypoints through WorldGL tools, and verify the actual movement.

The helper tests pass, and checking the failed experiment's recorded path does not verify an orbit. That establishes something about the helpers, not about the small model's ability to use them.

There is an important chronology limit: the named export predates these new orbit helpers. It demonstrates non-use of the programming tools and the earlier workspace, not rejection of files added afterward. The subsequent observation is still that the model does not use the workspace helpers; no separate post-helper export is identified here to measure that behavior in detail.

The workspace is also Git-ignored. These are local experimental artifacts, not automatically distributed capabilities.

## What I learned

Giving a model a capability does not mean it will discover or use it. A helper sitting in a directory is not the same as a tool the model reliably selects.

This was not only a mathematics failure. The model also lost track of which command failed, confused a landmark's height with a valid flight altitude, and treated a local arrival as global completion. Better arithmetic cannot fix all of those errors.

The stronger prompt was not sufficient either. It explicitly distinguished writing from executing and planning from moving. The model still skipped that workflow. I cannot conclude that permissions caused the problem: it never attempted a programming-tool call in the inspected session.

There is another misleading signal in the experiment infrastructure: the export's `completed` label means the assistant stopped normally, not that the navigation mission succeeded. A confident final answer and a completed session are both compatible with a failed flight.

## What's next

I want to test helper adoption separately from navigation. Can this model read `ORBIT.md`, run the example, and report the generated waypoints before being asked to fly anything?

If that works, the next step is one landmark and one verified loop, not the entire mission. I will keep the helper version and session export together so that tool availability, actual helper use, and physical completion can be compared.

For now, the result is a failed approach, not a solved navigation problem. The calculations are available; the agent is not reliably turning them into actions and evidence.
