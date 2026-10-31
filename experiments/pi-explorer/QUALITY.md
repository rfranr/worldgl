# Adapter quality checks

Run `npm run check:report` from the repository root. No separate adapter check is required.

## Why the previous report missed the adapter

The original `lint` command and `scripts/complexity-report.mjs` hard-coded `src/`. The test command ran only `tests/*.test.ts`, and dependency/structure reports also scanned only `src/`. The editor ran ESLint directly on changed adapter files, so it exposed diagnostics absent from the project command.

The previously reported 22 diagnostics were:

| Rule/category | Count | Cause and resolution |
| --- | ---: | --- |
| `no-undef` | 14 | ESLint lacked Node runtime globals and the `window` global used in Playwright callbacks. Configure actual host globals as readonly; declare `window` only for the two mixed-runtime modules. The adapter lint regression verifies that unknown names and `window` in Node-only modules still fail. |
| `preserve-caught-error` | 3 | Wrapped startup/API/disconnection errors discarded the original error. Preserve it with `Error`'s `cause`. Also guard browser/page access after concurrent shutdown to avoid a secondary `TypeError`. |
| Cyclomatic/cognitive complexity | 5 | Validation mixed route, queue, numeric and coordinate rules; page dispatch mixed branching with dispatch; connection checks were repeated; test fixtures used nested conditionals. Split cohesive responsibilities and use explicit fixtures, retaining all assertions. A function can trigger both complexity rules. |

Scanning **all** adapter modules revealed **49** diagnostics in total: 32 `no-undef`, 3 missing causes, 5 cyclomatic complexity, 5 cognitive complexity and 4 excessive nesting. Additional genuine problems were nested export aggregation, oversized snapshot construction and intertwined launcher filtering/selection. Export aggregation, capture/artifact writing, and model prompting now have separate cohesive functions. Tool registration is separated from session lifecycle handling, also removing two newly exposed TypeScript metrics warnings.

No rule was suppressed, no threshold changed, and no dependency installed. Runtime-global declarations correct the execution environment; they do not allow arbitrary undefined names.

## Current coverage

- `npm run lint`: all adapter `.mjs`/`.ts` files (including tests), `src/`, and the report runner.
- `npm test`: core tests plus every adapter `*.test.mjs` and the existing `test.mjs`. Browser-dependent `smoke.mjs` remains an explicit manual check.
- `npm run complexity`: ESLint/SonarJS cognitive scores for both `src/` and the entire adapter, including JavaScript and tests. Mandatory complexity limits remain enforced by `lint`.
- `npm run metrics` / `metrics:html`: both directories. `tsmetrics` supports TypeScript here and skips `.mjs`; ESLint and the cognitive report cover those JavaScript modules instead.
- `npm run dependencies` / `structure`: start from `src/` and all adapter `.mjs`/`.ts` entry files. Dependency validation retains reachable installed-package dependencies too (no new exclusions). The structure summary focuses on first-party modules and now recognizes adapter edges rather than counting only `src/` edges.
- `check:report` runs all check/report commands and retains any nonzero command result, rather than discarding report-command failures. TypeScript/Vite build behavior is unchanged; the adapter's Pi-loaded entry point is not part of the browser bundle.

## Verified results

- ESLint diagnostics: **49 → 0** across the adapter.
- Cognitive complexity: **262 total, 5 maximum**, zero violations across the expanded scope; the adapter contributes 91 and unchanged `src/` contributes 171. The previous 171 total excluded the adapter and is not a like-for-like baseline. The full adapter scan previously contained a function scoring 40.
- Tests: **39 core + 21 adapter passing**; build passes.
- Dependency violations/cycles: **0**. Adapter maximum first-party fan-out is 2 and depth is 1; repository maximum depth remains 8. No new module indirection was introduced by the refactors.
