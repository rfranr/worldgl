Implement a read-only experiment inspector for WorldGL.

## Goal

Allow users to inspect previously recorded Pi agent experiments, including the agent conversation, tool calls, navigation trajectory, and execution results.

Reuse the existing Pi session exports and WorldGL trajectory JSON format. Do not introduce a new export format unless strictly necessary.

## Requirements

### Import
- Provide a browser interface to select an experiment directory using the directory picker (`webkitdirectory`).
- Also support selecting individual files as a fallback.
- Discover supported artifacts within the selected directory, including nested folders.
- Parse Pi session exports and WorldGL trajectory JSON files.
- Handle missing, incomplete, or invalid artifacts gracefully.

### Inspection
- Display the conversation chronologically, including user prompts, assistant messages, tool calls, arguments, and tool results.
- Display the recorded trajectories on a 2D map, reusing existing visualization logic where practical.
- Provide a summary of the experiment: model, task, tool usage, distance traveled, simulation duration, and navigation outcomes, when available.
- Allow selecting a navigation tool call and inspecting its corresponding trajectory segment.
- Only associate tool calls with trajectory segments when the available data supports a reliable correlation. Otherwise, report the association as unknown.

### Architecture and security
- Process all imported files entirely in the browser.
- No backend, upload endpoints, or server-side filesystem access.
- Do not expose `experiments/` through Vite, static assets, or HTTP routes.
- Do not bundle experiment artifacts into the application.
- Keep the inspector independent of the live simulation. Importing an experiment must never execute commands or modify the active world.
- Treat imported content as untrusted data and render it safely.
- The inspector must work when deployed as a public static website.

### Validation
- Add automated tests for parsing, validation, and analysis.
- Preserve existing simulation, recording, and export behavior.
- Run the project's quality checks.
- Report limitations, particularly around correlating Pi tool calls with recorded trajectories.

Choose the implementation approach and UI structure yourself. Prefer a simple, maintainable solution over unnecessary abstractions.
