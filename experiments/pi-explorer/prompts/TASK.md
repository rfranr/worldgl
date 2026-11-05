Explore the entire world autonomously.

Your mission is to physically visit every known landmark and perform a complete 360-degree flight around each one.

For every landmark:
- Approach it at a safe altitude.
- Fly a complete loop around it, keeping a reasonably constant distance from its center.
- Use multiple navigation commands if necessary.
- Return approximately to your starting point around that landmark.
- Verify your movements using the available inspection and navigation tools.

After visiting all landmarks, perform one larger flight around the entire group of landmarks, enclosing them within your route.

--------------

You are controlling a flying vehicle, not teleporting between locations. Respect the world's movement constraints.

You can program tools using node in workspace

If a route becomes blocked, investigate and find an alternative.

You decide the route, altitude, waypoints and number of navigation commands. Do not ask for instructions unless you are genuinely unable to proceed.

Do not claim to have completed a loop unless you have physically traversed it.

At the end, report which loops succeeded, which failed, and what difficulties you encountered.

Explore the entire world autonomously.


-------------- with coding
# Mission: Optimal World Exploration

Find the shortest feasible flight route that visits every landmark in the world and returns to your starting position.

## Objectives

1. Inspect the world to discover your starting position, available landmarks and terrain constraints.
2. Determine the optimal order in which to visit all landmarks.
3. Calculate a route that minimizes total flight distance while respecting terrain clearance and movement constraints.
4. Execute the route by physically flying through the world.
5. Verify that every landmark was visited and that you returned to your starting position.
6. Compare the actual distance traveled with your estimated optimal distance.

## Constraints

- Do not teleport or modify the world.
- Maintain safe terrain clearance throughout the flight.
- Do not assume straight-line paths are always feasible.
- You may write and execute Node.js code in your workspace.
- You decide which tools, calculations and algorithms to use.
- Do not claim optimality without supporting evidence.
- Do not modify the WorldGL implementation or experiment adapter.

## Final Report

Provide:

- Starting position and discovered landmarks.
- Selected visiting order.
- Estimated optimal flight distance.
- Actual recorded flight distance.
- Difference between estimated and actual distance.
- Navigation difficulties, obstacles and deviations.
- Explanation of how you determined the route.
- Any code or reusable functions you created.

**Success requires visiting every landmark, returning to the starting position and providing evidence that your route is optimal or explaining why optimality could not be established.**

TEACHER
---------------------
# Mission: Build Navigation Tools for a Small LLM

Your task is to prepare a set of reusable navigation tools that will help a small local LLM explore WorldGL autonomously.

The target agent has limited spatial reasoning and planning capabilities.

## Objectives

1. Inspect the existing WorldGL tools and their semantics.
2. Identify which navigation tasks may be difficult for a small LLM.
3. Design and implement reusable helpers in the workspace.
4. Reduce the amount of spatial reasoning required from the target agent.
5. Keep the interface simple enough for a small model to understand and use.
6. Validate the helpers against the existing WorldGL environment.

## Constraints

- Work only inside the experiment workspace.
- Do not modify WorldGL core or the existing experiment adapter.
- Use existing WorldGL capabilities.
- Do not teleport or bypass movement constraints.
- Prefer a small number of high-level operations over many low-level tools.
- Keep asynchronous movement and completion semantics explicit.
- Include examples and brief documentation.

## Deliverables

Create in the workspace:

1. Reusable navigation helper functions.
2. A simple agent-facing interface with clear input and output contracts.
3. Tests or executable examples demonstrating correct behavior.
4. A short README explaining how a small LLM should use the tools.

## Validation

Demonstrate that the tools can support an agent in:

- Navigating to a landmark.
- Visiting multiple landmarks.
- Navigating around a landmark.
- Recovering from interrupted or blocked movement.

Do not assume the tools are effective merely because they work.

Explain which cognitive demands each helper removes from the small model.

**The goal is not to solve one mission for the small LLM, but to give it reusable capabilities for future missions.**