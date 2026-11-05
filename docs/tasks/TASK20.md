# Task 19: Factual blocked-navigation diagnostics

## Goal

Give the LLM enough evidence to reason about a blocked movement without choosing a recovery policy for it.

## Requirements

- Preserve asynchronous `move_to` acceptance and existing movement, queue and route behavior.
- Expose `blockage` on blocked navigation status and the corresponding command outcome, including route outcomes.
- Include the stopped position and attempted target.
- Distinguish `destination_below_clearance`, reporting `constraints.minimumTargetY`, from `no_progress`, reporting remaining distance and simulation seconds without meaningful progress.
- Preserve diagnostics as detached historical snapshots; clear current diagnostics on replacement, cancellation or a new command.
- Do not emit `suggestedAction` or `retryable`, perform automatic retries, or add path planning. The LLM decides whether and how to recover.
- Explain that blocked terminates an attempt, not proof that all routes to the goal are unreachable.
- Test causes, snapshot isolation, lifecycle and route propagation; run all project quality checks.
