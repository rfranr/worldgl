Extend the existing Experiment Inspector to support **visual comparison of 2 to N experiment exports**.

The goal is to understand how different agents approach the same mission: their decisions, strategies, reactions to obstacles, and outcomes.

Reuse the existing export schema and inspector. Do not change the agents or the export format.

### Visual comparison

Provide an interactive comparison view that includes:

- **Overlaid trajectories:** display each agent's route on the same map, with distinct colors and a legend.
- **Parallel timelines:** visualize navigation commands, inspections, interruptions, blocked movements, and other significant events for each agent.
- **Decision points:** highlight where agents choose different actions or strategies, allowing users to inspect the available evidence.
- **Comparative metrics:** distance travelled, duration, tool calls, interruptions, completed movements, and other available measurements.
- **Event inspection:** selecting a point on a timeline or trajectory should reveal the associated recorded information when correlation is supported by the data.

Support 2 to N experiments, with controls to show, hide, and focus on individual runs.

Do not assume events are synchronized across experiments. Clearly distinguish observed actions from agents' stated reasoning, and never invent correlations or missing data.

The interface should help a human understand **why different agents behaved differently**, not merely which one produced better numbers.

You decide the visualization design, architecture, and implementation. Preserve existing inspector functionality and quality constraints.
