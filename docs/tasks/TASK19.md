# Assignment: Composable Explorer Capabilities

## Goal

Allow `pi-explorer` to run in two selectable modes against the same WorldGL environment:

- **World Only:** The agent can interact with WorldGL using the existing world tools.
- **World + Coding:** The agent has the same world tools plus Pi's built-in `read`, `write` and `bash` tools, allowing it to write and execute Node.js code.

The purpose is to investigate whether giving an agent the ability to program improves its exploration and navigation behavior.

Do not provide predefined mathematical or navigation helpers. Let the agent decide whether to create them.

## Requirements

### 1. Feature composition

Introduce a minimal composition mechanism in `experiments/pi-explorer`.

Each feature should declare the capabilities it contributes.

Start with two features:

- `worldFeature`: Existing WorldGL tools, shared by both modes.
- `codingFeature`: Enables Pi's built-in `read`, `write` and `bash` tools.

Compose the two modes declaratively:

```js
const modes = {
  worldOnly: [worldFeature],
  worldWithCoding: [worldFeature, codingFeature],
};
```

Avoid building a generic plugin framework, dependency injection system or unnecessary abstractions.

### 2. Mode selection

Extend the existing interactive launcher to allow selecting an exploration mode.

Keep the existing model selection mechanism.

The selected mode should determine:

- Available Pi built-in tools.
- Available WorldGL tools.
- Agent-facing system instructions.
- Working directory behavior.

Do not duplicate the launcher or the existing WorldGL tool implementations.

### 3. World Only mode

Preserve the current experimental behavior:

- Existing WorldGL tools only.
- No built-in filesystem or shell tools.
- No access to arbitrary JavaScript execution.
- Temporary working directory, cleaned up after execution.

### 4. World + Coding mode

Enable Pi's built-in tools:

```text
read,write,bash
```

Allow the agent to:

- Write and execute Node.js scripts.
- Create reusable functions and modules.
- Perform mathematical calculations.
- Develop its own navigation helpers.
- Inspect and refine its own code.

Use a persistent workspace under `experiments/pi-explorer/workspace/`.

Keep generated files separate from experiment implementation.

Do not give the agent predefined solutions or mathematical helpers.

### 5. Agent instructions

Use mode-specific system instructions.

Both modes must:

- Explore the same WorldGL environment.
- Use the existing WorldGL tools to observe and interact with the world.
- Distinguish command acceptance from movement completion.
- Respect the existing navigation and interruption semantics.

In Coding mode:

- Explain that the agent may write and execute its own Node.js code.
- Restrict intended file modifications to its workspace.
- Do not encourage any particular mathematical technique or navigation algorithm.
- Do not modify WorldGL core or the experiment adapter.

### 6. Preserve experiment controls

Keep the following disabled in both modes:

- Extensions other than the existing WorldGL integration.
- MCP integrations.
- Skills.
- Prompt templates.
- Repository context files.
- Session persistence.

Preserve existing tool contracts, telemetry and experiment export behavior.

### 7. Validation

Verify that:

1. World Only mode retains its current tool restrictions.
2. World + Coding mode exposes `read`, `write` and `bash` alongside the WorldGL tools.
3. The agent can create and execute a simple Node.js script.
4. Workspace files remain available between runs in Coding mode.
5. WorldGL behavior is unchanged.
6. Switching modes does not require editing source code.

Preserve existing tests and add focused tests for mode composition and tool configuration.

## Expected result

A small, maintainable implementation that allows comparing:

**Agent + WorldGL tools**

versus

**Agent + WorldGL tools + programmable workspace**

Keep the WorldGL core unchanged.

Use the existing project quality workflow.

Prefer a minimal implementation over speculative abstractions.
