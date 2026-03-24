# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Gate-Compliance-Checker
Erlaubter Scope: Final gate review
Inputs: Changed paths + preflight state
Outputs: GATE_REPORT.md (pass/fail)
Spezifische Guards + messbare Done-Kriterien: Guard: Final release gate; can block merge/push. Done: `GATE_REPORT.md` exists and states pass or fail.
