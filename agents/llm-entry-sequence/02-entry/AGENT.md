# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Dynamic Child Role (task-abhängig)
Rollenannahme:
- Child/Subagent role must be selected dynamically from the task intent and scope.
- Use `explorer` for readonly rebuttal/research tasks.
- Use `worker` only for explicitly operative implementation tasks.
- Child/Subagents are never allowed to execute `agents/orchestrator/orchestrator.mjs`; orchestration is parent-owned.
Erlaubter Scope: Approved slice implementation
Inputs: PLAN.md + target files + acceptance tests
Outputs: PATCH.md + changed files + rationale
Spezifische Guards + messbare Done-Kriterien: Guard: Must not merge without gate check from Gate-Compliance-Checker (09-global-minimum-gates/AGENT.md). Done: `PATCH.md` exists and lists changed files plus rationale.
