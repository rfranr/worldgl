# Pi World Explorer

Minimal experiment for installed Pi **1.4.0**. Uses Pi's existing model selection and credentials; no agent loop or model SDK. The world simulation is unchanged.

## Setup and run

From the repository root, start worldgl:

```sh
npm install
npm run dev -- --host 127.0.0.1
```

In another terminal, install the experiment once:

```sh
cd experiments/pi-explorer
npm ci
npx playwright install chromium
# If Chromium reports missing system libraries: npx playwright install-deps chromium
```

With worldgl running, launch with one command:

```sh
npm start
```

A graphical desktop/display is required: Chromium is deliberately **not headless**. Default URL: `http://localhost:5173`. Override with `WORLDGL_URL=http://127.0.0.1:5174 npm start` if necessary. Only local HTTP(S) URLs are accepted.

1. Check the startup notification lists exactly `inspect_world`, `move_by`, `move_to`, `navigation_status`, `stop_movement`, `turn_by`, `look_at`.
2. Select an already configured model with Pi's `/model` selector (existing Pi authentication is reused).
3. Paste the contents of [prompt.md](prompt.md) into Pi and submit.
4. Watch Chromium while the agent operates. Avoid keyboard movement/manual navigation, which can interfere with the experiment.
5. Exit Pi normally to close Chromium. If the page/browser is closed, tools report a disconnection; restart the experiment rather than silently resetting its world.

Movement returns an acceptance acknowledgement immediately, not arrival. Read `navigation_status` for progress. Reissuing movement replaces the destination. `move_by` uses player-relative forward/right/up; `move_to` uses absolute x/y/z, with Y up. World API errors (including invalid relative destinations) are surfaced as tool errors.

## Isolation

The launcher uses `--no-builtin-tools`, `--no-extensions` (except this explicit extension), `--no-mcp`, `--no-skills`, `--no-prompt-templates`, and `--no-context-files`, in a fresh temporary working directory. It supplies a non-coding system prompt and starts a fresh ephemeral session. No repository contents are passed to the model.

The extension explicitly sets and checks the five-tool active set at session startup and before each agent run, and blocks any other tool call. There is no DOM, shell, file, arbitrary JavaScript, or unrestricted Playwright tool. Only a fixed page-evaluation function dispatches the five public world operations.

This is **tool-level isolation, not an OS security sandbox**. The trusted extension itself has normal process permissions; Pi's human-operated UI is not sandboxed. Do not load other extensions or attach repository files to this experiment.

## Tests

```sh
npm test       # mock-based validation, API dispatch, disconnections, formatting
npm run smoke # optional: running worldgl + graphical display + Chromium required
```

Neither command makes model API calls. Smoke opens real visible Chromium, observes actual state, initiates movement, checks position changes, replaces a destination, checks navigation, and stops movement in the same session.

## Verification report

- Installed Pi 1.4.0 CLI flags checked with `pi --help`.
- Three focused unit tests passed.
- Real headed Chromium smoke passed against local Vite worldgl: actual inspection, position changes, target replacement, navigation and cancellation verified.
- Pi loaded the extension successfully in RPC mode without a model request; startup verified the exact five-tool active set and `get_state` returned the existing configured model.
- No simulation/public API changes were made.
- No model-driven exploration was executed or observed. Provider authentication was reused by configuration but not validated through a paid/model request. The experiment's behavioral question remains for an actual exploration run.
