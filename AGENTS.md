# Agent Instructions

## Development

- Keep implementations simple, readable, and maintainable.
- Preserve existing behavior and public APIs unless explicitly requested otherwise.
- Prefer meaningful refactoring over changes made solely to satisfy metrics.
- Avoid unnecessary abstractions.

## Code Quality

After modifying source code:

1. Run `npm run check:report`.
2. Review ESLint violations and the cognitive complexity report.
3. Fix violations without changing quality thresholds or disabling rules.
4. Do not modify existing tests to make them pass.
5. Repeat verification until all checks pass.

## Environment

- Do not install dependencies or modify the environment without approval.
- Never install global packages.
- Do not modify files outside the project.

## Completion

Report:
- Summary of changes.
- Total and maximum cognitive complexity.
- Number of remaining violations.
- Test and build results.

Never claim verification succeeded unless the checks were actually executed.
