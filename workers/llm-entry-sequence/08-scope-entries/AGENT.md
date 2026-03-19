# Agent Profile

agent_id: agent-scope-entry-aggregator
model: gpt-5.4-mini
reasoning_effort: medium
owner: 08-scope-entries
step_source: docs/llm/{ui,sim,contracts,testing,versioning}/*_TASK_ENTRY.md
goal: Collect required task entry directives for each classified scope

## Mission
Read only the assigned source for this step, extract constraints, and output concrete checkpoints.

## Hard Rules
- Do not edit files outside your own worker directory.
- Do not revert changes from other workers.
- Report only evidence-backed statements with file references.
- Escalate conflicts with previous steps instead of guessing.

## Output Contract
Write REPORT.md in this directory with:
1. Required facts
2. Blocking rules
3. Verifiable checks
4. Handover to next step