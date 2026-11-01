# First experiments: giving an agent a world to explore

*November 1, 2026 — Retrospective notes from October 30–31*

## What I wanted to try

I started WorldGL as a small Three.js experiment: procedural terrain, a flying craft, a few landmarks, and an API to inspect and manipulate the world.

The interesting question came later: what would happen if I gave an AI agent access to the world through a small set of tools, without exposing the implementation?

Could it explore the environment, discover landmarks and navigate between them?

## What happened

The first experiments were surprisingly encouraging.

An agent managed to visit landmarks and navigate around them. In one session, it reported exploring the perimeter and returning toward the center.

But not every agent behaved consistently.

Other model runs showed erratic navigation, and a small local model struggled with the task. These were informal observations, not controlled comparisons.

I also discovered that the navigation API's semantics mattered more than I initially expected.

Movement was asynchronous. Issuing a command did not mean that the craft had reached its destination. Agents needed to check navigation status, handle interruptions and distinguish accepted commands from completed actions.

Some failures exposed ambiguities in the tools rather than clearly demonstrating limitations of the models.

## What I learned

A working tool is not necessarily an easy tool for an agent to use.

The distinction between requesting movement and observing its outcome became particularly important.

I also realized that observing an agent's final explanation was not enough. I wanted to inspect what it actually did.

This led to trajectory recording, experiment exports and tools for inspecting and comparing recorded runs.

Those tools make behavior easier to investigate, but they don't automatically explain why an agent made a particular decision.

## What's next

One question keeps coming back:

**What happens when different agents interact with the same world through different interfaces?**

A small model might benefit from higher-level navigation tools, while another agent might work with more primitive controls.

The environment could remain unchanged. Only the exposed capabilities and their semantics would differ.

I haven't tested that systematically yet.

For now, WorldGL is a place to explore the question, one experiment at a time.
