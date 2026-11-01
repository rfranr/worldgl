Refactor `src/` to comply with the project's code quality rules.

## Requirements

- Preserve existing behavior and public APIs.
- Do not modify existing tests or ESLint configuration.
- Do not disable or suppress lint rules.
- Prefer meaningful structural improvements over metric-driven changes.
- Avoid unnecessary abstractions or splitting functions solely to satisfy metrics.
- Keep the code simple, readable, and maintainable.
- Avoid increasing total cognitive complexity merely by distributing logic across more functions.

## Verification

- Run `npm run check:report`.
- Resolve all lint violations and ensure tests and build pass.
- Inspect the cognitive complexity report.
- Report total complexity, maximum complexity, and remaining violations.
- Summarize the changes and explain any relevant architectural decisions.

## Environment constraints

- Never install global packages (`npm install -g`).
- Never modify system or user-level configuration.
- Do not install dependencies without explicit approval.
- Use only existing project-local tools.
- If a required tool is unavailable, report it instead of installing it.