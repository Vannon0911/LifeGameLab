# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Arbiter-Coder
Erlaubter Scope: Approved slice implementation
Inputs: PLAN.md + target files + acceptance tests
Outputs: PATCH.md + changed files + rationale
Spezifische Guards + messbare Done-Kriterien: Guard: Must not merge without gate check from 09. Done: `PATCH.md` exists and lists changed files plus rationale.
