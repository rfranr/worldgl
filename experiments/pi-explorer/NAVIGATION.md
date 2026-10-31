# Queued navigation

`move_to({x,y,z})` retains replacement semantics and its immediate acknowledgement.
`move_to({x,y,z,queue:true})` appends a destination and returns `{accepted:true,id}` immediately. Commands execute FIFO, one at a time, using the existing movement constraints. The browser API equivalent is `world.interact.moveTo({x,y,z}, {queue:true})`.

At most 64 pending destinations (plus one active) are accepted. Invalid coordinates, nonboolean queue flags and overflow throw without changing navigation. Targets are copied on acceptance.

`stop_movement` explicitly aborts navigation, including rotation, and clears pending commands. Browser consumers can use `world.interact.abortNavigation()`. Active and pending commands receive `cancelled` outcomes. Existing `stop()`, replacement movement, manual controls, turning, teleporting and reset interrupt navigation and clear pending commands with `interrupted` outcomes. There is no preserve-pending cancellation mode.

`navigation_status` retains `state` and `target`, adding `active`, `pending`, `progress` (remaining Euclidean distance and fraction), and the most recent 100 `outcomes`, keyed by monotonically increasing command IDs. Status is a detached snapshot. Fraction measures displacement toward the current target, not elapsed time or route completion. Arrival uses the existing 0.15-unit tolerance. The next command starts only after arrival, and physically advances on a subsequent simulation tick.

Terrain blockage or five seconds without meaningful progress produces `blocked`. Unexpected stepping exceptions produce `failed`. Either stops execution and cancels all pending commands; the preceding terminal outcome identifies the cause and nothing is silently skipped. New submissions after a terminal state start a new sequence. Idle after abort is retained for compatibility; outcomes distinguish cancellation from interruption. Navigation failures map to the existing blocked trajectory outcome so the experiment export schema is unchanged.

## Routes

`execute_route({waypoints:[{x,y,z}, ...]})` (browser: `world.interact.executeRoute(waypoints)`) atomically validates 1–65 destinations before replacing navigation. The browser API returns `{accepted:true,id,commandIds}` immediately and remains unchanged. The Pi tool waits asynchronously, checking `navigation_status` internally every 100 ms, and returns `{id,commandIds,state,completed,outcomes}`. Browser `arrived` is reported as tool state `completed`; other terminal states are preserved. No model calls are required between waypoints. `move_to(queue:true)` still returns immediately.

The adapter forwards the Pi cancellation signal and limits route waiting to ten minutes (including submission). Cancellation aborts only the matching route; replacement routes are never stopped. Shutdown/disconnection interrupts waiting, and timeout reports `failed` with a reason and aborts the matching route. Cleanup is bounded to one second even if the renderer is unresponsive. In these exceptional cases results contain the latest observed waypoint outcomes, or the final cancellation snapshot if available; they cannot guarantee unobserved outcomes from a closed/frozen simulation. Waypoints run through the same FIFO and movement constraints; terrain is checked during movement, not preflight.

`navigation_status.route` retains the latest route ID, ordered command IDs, completed count, outcomes and state. State is `moving` until arrival or the first blocked, failed, cancelled or interrupted outcome. Remaining commands are cancelled after failure; completed outcomes remain available. Abort cancels active and pending commands; replacement interrupts them. A subsequent route replaces this route summary; command history still retains its usual latest 100 outcomes. Status snapshots are detached.
