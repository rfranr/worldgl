# Assignment — Pi World Explorer

Repository: https://github.com/rfranr/worldgl

## Goal

Create a minimal Pi extension that allows an AI agent to explore the existing worldgl simulation through a real browser.

Use Playwright to connect Pi tools to the public `window.world` API.

This is an experimental integration. The objective is to observe how an agent explores a world when given only observation and movement capabilities.

**Do not modify the worldgl simulation or its public API.**

## Architecture

```text
Pi Agent
   |
   | Custom tools
   v
Pi Extension
   |
   | Playwright
   v
Chromium
   |
   | window.world
   v
worldgl
```

## Requirements

### 1. Pi extension

Create the experiment under:

`experiments/pi-explorer/`

Use the existing Pi extension mechanism (`pi.registerTool`) and the project's installed Pi version.

Do not implement a custom agent loop or integrate a separate LLM SDK.

Reuse Pi's existing model configuration and authentication.

### 2. Browser integration

- Launch a Chromium browser using Playwright.
- Connect to a running local worldgl instance.
- Keep the same browser session alive across tool calls.
- Execute world operations through `page.evaluate()`.
- Keep the browser visible so a human can observe the experiment.
- Detect page disconnection and report meaningful errors.
- Clean up browser resources when the extension shuts down.

### 3. Agent tools

Expose these tools to Pi:

| Tool | World API |
|---|---|
| `inspect_world` | `world.inspect()` |
| `move_by` | `world.interact.moveBy()` |
| `move_to` | `world.interact.moveTo()` |
| `navigation_status` | `world.interact.getNavigationStatus()` |
| `stop_movement` | `world.interact.stop()` |

Each tool must validate its inputs and return concise, structured information.

Movement commands must return immediately. Do not wait for the player to reach its destination.

The agent can issue another movement command while the previous one is still running.

### 4. Agent isolation

The experiment must be launched with Pi's built-in filesystem and shell tools disabled.

The agent must not have access to:

- Repository source files.
- Filesystem exploration tools.
- Shell commands.
- Browser DOM inspection.
- Arbitrary JavaScript execution.
- Playwright APIs other than the predefined world tools.

The agent must interact exclusively through the five registered tools.

This is tool-level isolation, not an operating-system security sandbox. Do not claim otherwise.

### 5. Exploration prompt

Provide this initial prompt:

> You control a player inside a simulated 3D world.
>
> You can inspect the world and move the player using the available tools.
>
> Your task is to explore the world.
>
> Decide autonomously what to investigate, where to move, and when you have explored enough.
>
> Movement commands are asynchronous: issuing a command does not mean the player has reached its destination.
>
> Report what you discovered and describe how you explored it.

Do not prescribe a route, number of movements or exploration strategy.

### 6. Running the experiment

Provide a simple documented workflow to:

1. Start worldgl locally.
2. Launch Pi with the extension.
3. Select an already configured model.
4. Submit the exploration prompt.
5. Observe the browser while the agent operates.

Prefer a single command to launch Pi once worldgl is running.

Use `--no-builtin-tools` or the equivalent supported by the installed Pi version, and verify that only the intended tools are exposed.

### 7. Acceptance criteria

- Pi starts successfully using existing model credentials.
- Chromium opens and renders worldgl.
- `inspect_world` returns the actual world state.
- `move_by` initiates visible movement.
- `move_to` changes the destination.
- `navigation_status` reports navigation progress.
- `stop_movement` cancels movement.
- The agent can perform multiple observation/action cycles without restarting Chromium.
- No filesystem, shell or unrestricted browser tools are available to the agent.
- The experiment does not require modifications to worldgl source code.

### 8. Tests

Add focused tests for:

- Tool argument validation.
- Mapping tool calls to the correct world API operations.
- Browser disconnection handling.
- Tool response formatting.

Include one optional browser integration smoke test.

Tests must not require model API calls or consume tokens.

## Constraints

- Keep the implementation minimal and understandable.
- Do not add MCP, WebSockets, HTTP APIs or backend services.
- Do not introduce a new agent framework.
- Do not implement autonomous navigation logic inside the extension.
- Do not modify the world simulation.
- Do not add features unrelated to the experiment.

## Deliverables

1. Working Pi extension.
2. Minimal setup and execution instructions.
3. Exploration prompt.
4. Focused tests.
5. Short report of what was implemented and verified.

Do not claim that the agent successfully explored the world unless an actual model-driven exploration was executed and observed.

**The experiment should answer one question: given a world and the ability to act, what does an agent decide to do?**
