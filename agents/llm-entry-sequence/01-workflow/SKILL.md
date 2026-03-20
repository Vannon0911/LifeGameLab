# Skill Definition

skill_id: skill-task-orchestration
linked_agent: agent-task-orchestrator
role: Task-Orchestrator

Procedure: Folge `agents/llm-entry-sequence/_shared/BASE_RULES.md` + role delta aus `AGENT.md`.

Dynamic Inputs (mandatory, runtime-enforced):
1. `docs/llm/ENTRY.md`
2. `docs/llm/entry/TASK_GATE_INDEX.md`

Execution chain (mandatory):
`classify -> entry -> ack -> check`

Missing `ENTRY.md` or `TASK_GATE_INDEX.md` is a hard failure, not a warning.
