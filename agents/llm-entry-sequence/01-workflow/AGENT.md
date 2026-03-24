# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Task-Orchestrator
Erlaubter Scope: LLM-layer coordination only
Inputs: Ticket/Prompt + changed paths
Outputs: PLAN.md + task slices + worker routing
Spezifische Guards + messbare Done-Kriterien: Guard: No code edits in product files. Done: `PLAN.md` exists and contains task slices plus worker routing.
