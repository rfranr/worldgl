# Proposed engineering journal

[Documentation home](../README.md)

Proposal only: no journal entries have been written.

## Layout

When approved, create `docs/journal/README.md` as an oldest-first index and
`docs/journal/YYYY-MM-DD-NN-short-topic.md` for each engineering session.
Use the actual work date, with a sequence number for multiple entries that day.
Record both work date and publication date when reconstructing historical work;
do not infer dates or outcomes from task numbers.

The index should list date, question, status and entry link. Keep current setup
and API reference outside the journal so readers need not read history to run the project.

## Entry template

1. **Context and provenance** — revision, environment, seed, model/provider identity where applicable, configuration, prompt and artifact references. Exclude credentials and review transcripts before sharing.
2. **Question and hypothesis** — what is uncertain and what evidence would support or refute the hypothesis.
3. **Intervention** — implementation or configuration changes, with links to diffs; separate them from pre-existing behavior.
4. **Procedure** — commands, inputs, repetitions and success criteria sufficient for reproduction.
5. **Observed results** — actual checks, measurements, errors and unavailable data; link evidence instead of inventing missing values.
6. **Interpretation and limitations** — what the observations support, alternative explanations, retention/clock issues and untested claims.
7. **Decision and next question** — adopted/rejected/deferred changes and a bounded follow-up.

Use explicit labels: **implemented**, **observed**, **hypothesis**, **not tested**.
Record failed and inconclusive runs, not only successes. Do not equate tool-call
acceptance with arrival, agent reasoning with causal evidence, or retained
trajectory duration with wall time.

## Candidate topics to investigate

Terrain and bounded flight; control handover; perception limits; trajectory
observability; Pi tool isolation and exports; queues and routes; comparison
evidence; quality-report coverage. These are topic suggestions, not a reconstructed
chronology or assertions of experimental success. Populate entries only after
checking revisions, artifacts and human recollection.
