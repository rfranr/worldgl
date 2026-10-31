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
3. Resolve quality violations through meaningful improvements, without weakening thresholds or suppressing rules.
4. Fix violations without changing quality thresholds or disabling rules.
5. Do not modify existing tests to make them pass.
6. Repeat verification until all checks pass.
7. Prefer cohesive modules, clear dependencies and limited shared mutable state.
8. Report remaining violations and relevant metric changes.
9. Review the dependency report for circular dependencies and architectural issues.
10. Review the structure report for excessive dependency depth, coupling, and unnecessary indirection.
    
Do not install dependencies or modify the environment without explicit approval.


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
