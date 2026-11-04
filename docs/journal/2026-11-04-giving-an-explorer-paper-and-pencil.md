# Giving an Explorer Paper and Pencil

*November 4, 2026 — Experiment notes*

## What I wanted to try

The first WorldGL experiments suggested that agents could navigate the environment, but smaller models sometimes struggled with spatial reasoning and asynchronous movement.

I started wondering whether the problem was really the model's ability to reason about space, or the tools I was giving it.

Until now, agents could inspect the world, issue movement commands and check navigation status. They couldn't write programs to help themselves.

I was effectively asking them to calculate trajectories without giving them paper and pencil.

So I changed that.

## Giving the agent the ability to program

I introduced two exploration modes:

- **World Only:** the existing WorldGL tools.
- **World + Coding:** the same tools, plus filesystem access and the ability to execute code.

The implementation uses Pi's built-in tools and a workspace where agents can create reusable scripts.

The WorldGL engine remained unchanged.

My initial expectation was that agents might write small functions for calculating distances, angles or navigation routes.

But the first results were unexpected.

## Having tools doesn't mean using them

I gave an agent a mission to explore the world autonomously.

Despite having access to Node.js and a workspace, it completed navigation tasks without writing any code.

It calculated coordinates, generated routes and checked navigation outcomes directly.

Even when explicitly told that programming was available, it preferred using the existing WorldGL tools.

I then changed the task: find the shortest feasible route visiting every landmark and returning to the starting position.

This time, the agent decided to program.

Interestingly, it chose Python rather than Node.js.

It used `itertools.permutations` and `math.dist` to evaluate possible visiting orders.

The resulting calculation was a useful geometric estimate, although it did not establish the shortest feasible flight route under terrain constraints.

The important observation was that the agent chose to use code when the task made computation useful.

It didn't need a predefined mathematical tool. It needed the freedom to create one.

## One agent building tools for another

The next idea was to ask a more capable model to prepare navigation helpers for a smaller local model running through Ollama.

The larger model created functions for visiting landmarks, waiting for movement completion, navigating around objects and recovering from failures.

This introduced another question:

Could one agent create abstractions that make an environment easier for another agent to navigate?

The helpers existed in the workspace, but they were not automatically registered as Pi tools. The smaller model still had to discover and use them.

That distinction turned out to matter.

## The small model and asynchronous movement

The smaller model could inspect the world and issue navigation commands.

However, it frequently struggled with the distinction between a movement command being accepted and the movement actually completing.

At one point, it called `move_by` using values derived from differences between world coordinates, without correctly accounting for the semantics of the movement controls.

The command was accepted, but the movement became blocked.

The model initially treated acceptance as sufficient evidence of progress.

In other runs, it understood that `navigation_status` should be checked but spent considerable effort reasoning about whether to call it.

These observations suggested that the difficulty was not exclusively spatial calculation.

Part of the challenge was managing the interaction protocol itself.

## The rock that disappeared

The most entertaining experiment started with a simple instruction:

**Destroy the rock.**

WorldGL did not expose a tool for destroying objects.

Nevertheless, the agent tried.

It inspected the environment, located the rock and attempted to navigate directly to its coordinates.

The movement was blocked.

It then tried approaching from another position, climbing above the rock and descending toward it.

Several attempts were blocked by the world's movement constraints.

Eventually, the agent reached a position above the rock and attempted to descend further. That movement was blocked too.

It inspected the world again.

The observation returned an empty object list.

The agent concluded:

**The rock has been destroyed.**

Except there was no evidence of destruction.

The inspection interface exposes perceived objects, not necessarily the complete internal state of the world.

An object disappearing from an observation does not establish that it has ceased to exist.

The agent had interpreted a change in perception as evidence that its attempted action had succeeded.

It had formed a causal explanation from incomplete information.

And it was wrong, or at least unable to justify its conclusion.

## What I learned

These experiments have raised several questions.

**Tool availability is not the same as tool usefulness.**

An agent may have access to programming capabilities without choosing to use them. The task itself influences whether programming becomes worthwhile.

**Spatial reasoning and interaction semantics are different problems.**

An agent might know where it wants to go but still fail to manage an asynchronous navigation command correctly.

**Reusable abstractions could help smaller models.**

A higher-level tool that resolves destinations, waits for completion and reports failures could reduce the reasoning required from the agent. This remains a hypothesis to test.

**Observation is not ground truth.**

The disappearing rock illustrated how an agent can construct a convincing explanation without sufficient evidence.

This last point may be more interesting than the navigation problem itself.

## What's next

I want to continue exploring composable agent capabilities without changing WorldGL's underlying simulation.

The next experiments could compare:

- Agents using only primitive world tools.
- Agents that can write and execute their own programs.
- Agents using higher-level tools created by another agent.

I also want to improve how experiments distinguish attempted actions, completed actions and observed consequences.

For now, the most memorable result is simple:

**I asked an agent to destroy a rock. It couldn't destroy the rock, but it managed to convince itself that it had.**

And that tells me something worth investigating.
